# server.py
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, aiofiles, random, string, asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# --- Cloudinary imports ---
import cloudinary
import cloudinary.uploader
import cloudinary.api
import cloudinary.utils

# --- Módulos propios (auth) ---
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin, require_advertiser, require_creator
)

# --- Modelos de Chat ---
from chat import ChatMessageCreate, ChatMessageResponse, ChatConversation, PaymentRequest

# ==================== CONFIGURACIÓN INICIAL ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configurar Cloudinary desde variables de entorno
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'familyfansmony')]

app = FastAPI(title="Family Fans Mony API")
api = APIRouter(prefix="/api")

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== HELPERS ====================
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

async def save_upload(file: UploadFile) -> str:
    ext = Path(file.filename).suffix if file.filename else ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = UPLOAD_DIR / fname
    async with aiofiles.open(fpath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    return f"/api/uploads/{fname}"

# ==================== ADMIN SEED ====================
ADMIN_EMAIL = "edrianttrejol@gmail.com"
ADMIN_PASS = "Sportox@22"

@app.on_event("startup")
async def startup():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASS),
            "role": "admin",
            "name": "Administrador",
            "balance": 0.0,
            "kyc_status": "verified",
            "is_top10": False,
            "created_at": now_iso(),
        })
        logger.info("Admin user seeded")
    
    settings = await db.platform_settings.find_one({})
    if not settings:
        await db.platform_settings.insert_one({
            "crypto_wallet_address": "",
            "crypto_network": "BEP20 (BSC)",
            "crypto_currency": "USDT/USDC",
            "bank_name": "",
            "bank_account_holder": "",
            "bank_account_number": "",
            "bank_details": "",
            "instructions": "Envía tu comprobante de pago después de realizar la transferencia.",
            "updated_at": now_iso(),
        })
        logger.info("Platform settings seeded")
    
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code")
    await db.campaigns.create_index("status")
    await db.deposits.create_index("status")
    await db.transactions.create_index("user_id")
    
    async for user in db.users.find({"referral_code": {"$exists": False}}):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "referral_code": code, 
            "referred_by": None, 
            "profile_photo_url": "", 
            "level_request_pending": False
        }})
    
    asyncio.create_task(cleanup_expired_content())

# ==================== AUTH ====================
class RegisterReq(BaseModel):
    email: str
    password: str
    name: str
    role: str = "fan"
    referral_code: str = ""

class LoginReq(BaseModel):
    email: str
    password: str

@api.post("/auth/register")
async def register(req: RegisterReq):
    if req.role not in ["fan", "advertiser", "creator"]:
        raise HTTPException(400, "Rol inválido")
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(400, "Email ya registrado")
    
    ref_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    referred_by = None
    if req.referral_code:
        referrer = await db.users.find_one({"referral_code": req.referral_code})
        if referrer:
            referred_by = str(referrer["_id"])
    
    user = {
        "email": req.email, 
        "password_hash": hash_password(req.password), 
        "role": req.role,
        "name": req.name, 
        "balance": 0.0, 
        "kyc_status": "none", 
        "is_top10": False,
        "created_at": now_iso(), 
        "creator_profile": None, 
        "phone": "", 
        "country": "",
        "gender": "", 
        "referral_code": ref_code, 
        "referred_by": referred_by,
        "profile_photo_url": "", 
        "level_request_pending": False,
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    token = create_token(str(result.inserted_id), req.role, req.email)
    return {"token": token, "user": serialize_doc(user)}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Credenciales inválidas")
    token = create_token(str(user["_id"]), user["role"], user["email"])
    return {"token": token, "user": serialize_doc(user)}

@api.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    return serialize_doc(u)

# ==================== CREATOR PROFILE ====================
@api.post("/auth/creator-profile")
async def save_creator_profile(
    content_type: str = Form(""), 
    region: str = Form(""), 
    gender: str = Form(""),
    phone: str = Form(""), 
    country: str = Form(""), 
    youtube_url: str = Form(""),
    tiktok_url: str = Form(""), 
    instagram_url: str = Form(""), 
    facebook_url: str = Form(""),
    spotify_url: str = Form(""), 
    apple_music_url: str = Form(""), 
    bio: str = Form(""),
    creator_level: str = Form("standard"), 
    artist_level: str = Form(""),
    niche: str = Form(""), 
    avg_views: int = Form(0), 
    followers: int = Form(0),
    metrics_screenshot: Optional[UploadFile] = File(None),
    user=Depends(get_current_user)
):
    screenshot_url = ""
    if metrics_screenshot:
        screenshot_url = await save_upload(metrics_screenshot)
    
    profile = {
        "content_type": content_type, 
        "region": region, 
        "gender": gender, 
        "bio": bio,
        "creator_level": creator_level, 
        "artist_level": artist_level, 
        "niche": niche,
        "avg_views": avg_views, 
        "followers": followers,
        "social_links": {
            "youtube": youtube_url, 
            "tiktok": tiktok_url, 
            "instagram": instagram_url,
            "facebook": facebook_url, 
            "spotify": spotify_url, 
            "apple_music": apple_music_url
        },
        "metrics_screenshot": screenshot_url, 
        "updated_at": now_iso(),
    }
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$set": {
            "creator_profile": profile, 
            "phone": phone, 
            "country": country, 
            "gender": gender
        }}
    )
    updated = await db.users.find_one({"_id": ObjectId(user["sub"])})
    return serialize_doc(updated)

# ==================== PLATFORM SETTINGS ====================
@api.get("/admin/settings")
async def get_settings(user=Depends(require_admin)):
    s = await db.platform_settings.find_one({})
    return serialize_doc(s) if s else {}

@api.put("/admin/settings")
async def update_settings(
    crypto_wallet_address: str = Form(""), 
    crypto_network: str = Form("BEP20 (BSC)"),
    crypto_currency: str = Form("USDT/USDC"), 
    bank_name: str = Form(""),
    bank_account_holder: str = Form(""), 
    bank_account_number: str = Form(""),
    bank_details: str = Form(""), 
    instructions: str = Form(""),
    user=Depends(require_admin)
):
    await db.platform_settings.update_one({}, {"$set": {
        "crypto_wallet_address": crypto_wallet_address, 
        "crypto_network": crypto_network,
        "crypto_currency": crypto_currency, 
        "bank_name": bank_name,
        "bank_account_holder": bank_account_holder, 
        "bank_account_number": bank_account_number,
        "bank_details": bank_details, 
        "instructions": instructions, 
        "updated_at": now_iso(),
    }}, upsert=True)
    return {"message": "Configuración actualizada"}

# ==================== DEPOSITS ====================
@api.post("/deposits")
async def create_deposit(
    amount: float = Form(...), 
    method: str = Form(...), 
    reference: str = Form(""), 
    proof: Optional[UploadFile] = File(None), 
    user=Depends(get_current_user)
):
    proof_url = ""
    if proof: 
        proof_url = await save_upload(proof)
    
    deposit = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "amount": amount, 
        "method": method, 
        "reference": reference, 
        "proof_url": proof_url, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None, 
        "reviewed_at": None, 
        "admin_note": ""
    }
    result = await db.deposits.insert_one(deposit)
    deposit["_id"] = result.inserted_id
    return serialize_doc(deposit)

@api.get("/deposits")
async def list_deposits(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    deposits = await db.deposits.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(d) for d in deposits]

@api.put("/admin/deposits/{deposit_id}/approve")
async def approve_deposit(deposit_id: str, user=Depends(require_admin)):
    dep = await db.deposits.find_one({"_id": ObjectId(deposit_id), "status": "pending"})
    if not dep: 
        raise HTTPException(404, "Depósito no encontrado o ya procesado")
    
    await db.deposits.update_one(
        {"_id": ObjectId(deposit_id), "status": "pending"}, 
        {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    await db.users.update_one(
        {"_id": ObjectId(dep["user_id"])}, 
        {"$inc": {"balance": dep["amount"]}}
    )
    await db.transactions.insert_one({
        "user_id": dep["user_id"], 
        "type": "deposit", 
        "amount": dep["amount"], 
        "reference_id": str(dep["_id"]), 
        "description": f"Depósito aprobado - {dep['method']} (${dep['amount']})", 
        "created_at": now_iso()
    })
    return {"message": "Depósito aprobado", "amount": dep["amount"]}

@api.put("/admin/deposits/{deposit_id}/reject")
async def reject_deposit(deposit_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.deposits.update_one(
        {"_id": ObjectId(deposit_id), "status": "pending"}, 
        {"$set": {
            "status": "rejected", 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso(), 
            "admin_note": note
        }}
    )
    if result.modified_count == 0: 
        raise HTTPException(404, "Depósito no encontrado o ya procesado")
    return {"message": "Depósito rechazado"}

# ==================== CAMPAIGNS ====================
class CampaignCreate(BaseModel):
    title: str
    description: str = ""
    budget: float
    payment_per_video: float
    niche: str = ""
    region: str = ""
    gender_preference: str = "any"
    videos_requested: int = 1
    social_networks: List[str] = []
    content_duration: str = "1_month"
    bonus_threshold_views: int = 0
    bonus_amount: float = 0
    influencer_level: str = "any"
    external_link: str = ""
    max_videos_per_creator: int = 1
    vocaroo_link: str = ""
    reference_link: str = ""
    audio_url: str = ""
    photo_url: str = ""

@api.post("/campaigns")
async def create_campaign(req: CampaignCreate, user=Depends(require_advertiser)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if u["balance"] < req.budget: 
        raise HTTPException(400, f"Saldo insuficiente. Tienes ${u['balance']}, necesitas ${req.budget}")
    
    region_warning = ""
    if req.region:
        region_count = await db.users.count_documents({
            "role": "creator", 
            "creator_profile.region": req.region
        })
        if region_count == 0: 
            region_warning = f"No hay creadores en {req.region}. La campaña se propondrá a creadores que cumplan el resto de requisitos."
    
    campaign = {
        "advertiser_id": user["sub"], 
        "advertiser_name": u.get("name", ""), 
        "title": req.title,
        "description": req.description, 
        "budget": req.budget, 
        "budget_remaining": req.budget,
        "payment_per_video": req.payment_per_video, 
        "niche": req.niche, 
        "region": req.region,
        "gender_preference": req.gender_preference, 
        "videos_requested": req.videos_requested,
        "videos_completed": 0, 
        "social_networks": req.social_networks, 
        "content_duration": req.content_duration,
        "bonus_threshold_views": req.bonus_threshold_views, 
        "bonus_amount": req.bonus_amount,
        "influencer_level": req.influencer_level, 
        "external_link": req.external_link,
        "max_videos_per_creator": req.max_videos_per_creator,
        "audio_url": req.audio_url, 
        "photo_url": req.photo_url, 
        "region_warning": region_warning,
        "vocaroo_link": req.vocaroo_link,
        "reference_link": req.reference_link,
        "status": "active", 
        "created_at": now_iso(),
    }
    
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$inc": {"balance": -req.budget}}
    )
    await db.transactions.insert_one({
        "user_id": user["sub"], 
        "type": "campaign_escrow", 
        "amount": -req.budget, 
        "reference_id": "", 
        "description": f"Reserva para campaña: {req.title}", 
        "created_at": now_iso()
    })
    
    result = await db.campaigns.insert_one(campaign)
    await db.transactions.update_one(
        {"user_id": user["sub"], "type": "campaign_escrow", "reference_id": ""}, 
        {"$set": {"reference_id": str(result.inserted_id)}}
    )
    campaign["_id"] = result.inserted_id
    return serialize_doc(campaign)

@api.get("/campaigns")
async def list_campaigns(status: str = Query(None), user=Depends(get_current_user)):
    query = {}
    if user["role"] == "advertiser": 
        query["advertiser_id"] = user["sub"]
    if status: 
        query["status"] = status
    campaigns = await db.campaigns.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(c) for c in campaigns]

@api.get("/campaigns/available")
async def available_campaigns(user=Depends(require_creator)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    query = {"status": "active"}
    
    campaigns = await db.campaigns.find(query).sort("created_at", -1).to_list(500)
    applied = await db.applications.find({"creator_id": user["sub"]}).to_list(500)
    applied_campaign_ids = {a["campaign_id"] for a in applied}
    
    result = []
    for c in campaigns:
        c_ser = serialize_doc(c)
        c_ser["already_applied"] = c_ser["id"] in applied_campaign_ids
        result.append(c_ser)
    return result

@api.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user=Depends(get_current_user)):
    c = await db.campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada")
    return serialize_doc(c)

@api.put("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(campaign_id: str, user=Depends(get_current_user)):
    c = await db.campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada")
    if user["role"] != "admin" and c["advertiser_id"] != user["sub"]: 
        raise HTTPException(403, "No autorizado")
    if c["status"] != "active": 
        raise HTTPException(400, "La campaña no está activa")
    
    refund = c["budget_remaining"]
    await db.campaigns.update_one(
        {"_id": ObjectId(campaign_id)}, 
        {"$set": {"status": "cancelled"}}
    )
    
    if refund > 0:
        await db.users.update_one(
            {"_id": ObjectId(c["advertiser_id"])}, 
            {"$inc": {"balance": refund}}
        )
        await db.transactions.insert_one({
            "user_id": c["advertiser_id"], 
            "type": "campaign_refund", 
            "amount": refund, 
            "reference_id": campaign_id, 
            "description": f"Reembolso por cancelación: {c['title']}", 
            "created_at": now_iso()
        })
    return {"message": "Campaña cancelada", "refund": refund}

# ==================== APPLICATIONS ====================
@api.post("/applications")
async def create_application(
    campaign_id: str = Form(...), 
    message: str = Form(""), 
    user=Depends(require_creator)
):
    existing = await db.applications.find_one({
        "campaign_id": campaign_id, 
        "creator_id": user["sub"], 
        "status": {"$in": ["pending", "accepted"]}
    })
    if existing: 
        raise HTTPException(400, "Ya tienes una aplicación activa para esta campaña")
    
    recent_expired = await db.applications.find_one({
        "campaign_id": campaign_id, 
        "creator_id": user["sub"], 
        "status": {"$in": ["expired", "rejected"]}, 
        "updated_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    if recent_expired: 
        raise HTTPException(400, "Debes esperar 24 horas antes de volver a aplicar a esta campaña")
    
    c = await db.campaigns.find_one({"_id": ObjectId(campaign_id), "status": "active"})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada o inactiva")
    
    max_per = c.get("max_videos_per_creator", 1)
    creator_deliverables = await db.deliverables.count_documents({
        "campaign_id": campaign_id, 
        "creator_id": user["sub"], 
        "status": "approved"
    })
    if creator_deliverables >= max_per: 
        raise HTTPException(400, f"Has alcanzado el límite de {max_per} videos para esta campaña")
    
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    app_doc = {
        "campaign_id": campaign_id, 
        "campaign_title": c.get("title", ""), 
        "creator_id": user["sub"], 
        "creator_name": u.get("name", ""), 
        "creator_email": u.get("email", ""), 
        "message": message, 
        "status": "pending", 
        "created_at": now_iso(), 
        "updated_at": now_iso(), 
        "accepted_at": None, 
        "deadline": None
    }
    result = await db.applications.insert_one(app_doc)
    app_doc["_id"] = result.inserted_id
    return serialize_doc(app_doc)

@api.get("/applications")
async def list_applications(campaign_id: str = Query(None), user=Depends(get_current_user)):
    query = {}
    if user["role"] == "creator": 
        query["creator_id"] = user["sub"]
    elif user["role"] == "advertiser":
        camps = await db.campaigns.find({"advertiser_id": user["sub"]}).to_list(500)
        camp_ids = [str(c["_id"]) for c in camps]
        query["campaign_id"] = {"$in": camp_ids}
    if campaign_id: 
        query["campaign_id"] = campaign_id
    
    apps = await db.applications.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(a) for a in apps]

@api.put("/applications/{app_id}/accept")
async def accept_application(app_id: str, user=Depends(get_current_user)):
    a = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not a: 
        raise HTTPException(404, "Aplicación no encontrada")
    
    if user["role"] == "advertiser":
        c = await db.campaigns.find_one({"_id": ObjectId(a["campaign_id"])})
        if not c or c["advertiser_id"] != user["sub"]: 
            raise HTTPException(403, "No autorizado")
    elif user["role"] != "admin": 
        raise HTTPException(403, "No autorizado")
    
    deadline = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    await db.applications.update_one(
        {"_id": ObjectId(app_id)}, 
        {"$set": {
            "status": "accepted", 
            "accepted_at": now_iso(), 
            "deadline": deadline, 
            "updated_at": now_iso()
        }}
    )
    return {"message": "Aplicación aceptada", "deadline": deadline}

@api.put("/applications/{app_id}/reject")
async def reject_application(app_id: str, user=Depends(get_current_user)):
    a = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not a: 
        raise HTTPException(404, "Aplicación no encontrada")
    await db.applications.update_one(
        {"_id": ObjectId(app_id)}, 
        {"$set": {"status": "rejected"}}
    )
    return {"message": "Aplicación rechazada"}

# ==================== DELIVERABLES ====================
@api.post("/deliverables")
async def submit_deliverable(
    application_id: str = Form(...), 
    video_url: str = Form(""), 
    notes: str = Form(""), 
    platform_links: str = Form(""), 
    platforms_count: int = Form(1), 
    screenshot: Optional[UploadFile] = File(None), 
    user=Depends(require_creator)
):
    a = await db.applications.find_one({
        "_id": ObjectId(application_id), 
        "creator_id": user["sub"], 
        "status": "accepted"
    })
    if not a: 
        raise HTTPException(404, "Aplicación no encontrada o no aceptada")
    
    if a.get("deadline"):
        deadline_dt = datetime.fromisoformat(a["deadline"])
        if datetime.now(timezone.utc) > deadline_dt:
            await db.applications.update_one(
                {"_id": ObjectId(application_id)}, 
                {"$set": {"status": "expired", "updated_at": now_iso()}}
            )
            raise HTTPException(400, "Se venció el plazo de 24 horas para subir el entregable")
    
    existing_del = await db.deliverables.find_one({
        "application_id": application_id, 
        "creator_id": user["sub"], 
        "status": {"$ne": "rejected"}
    })
    if existing_del: 
        raise HTTPException(400, "Ya enviaste un entregable para esta aplicación")
    
    screenshot_url = ""
    if screenshot: 
        screenshot_url = await save_upload(screenshot)
    
    deliverable = {
        "application_id": application_id, 
        "campaign_id": a["campaign_id"], 
        "creator_id": user["sub"], 
        "creator_name": a.get("creator_name", ""), 
        "video_url": video_url, 
        "platform_links": platform_links, 
        "platforms_count": platforms_count, 
        "screenshot_url": screenshot_url, 
        "notes": notes, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None, 
        "reviewed_at": None, 
        "initial_payment_released": False, 
        "final_payment_released": False, 
        "bonus_claimed": False, 
        "permanence_start": None, 
        "permanence_end": None
    }
    result = await db.deliverables.insert_one(deliverable)
    deliverable["_id"] = result.inserted_id
    return serialize_doc(deliverable)

@api.get("/deliverables")
async def list_deliverables(campaign_id: str = Query(None), user=Depends(get_current_user)):
    query = {}
    if user["role"] == "creator": 
        query["creator_id"] = user["sub"]
    elif user["role"] == "advertiser":
        camps = await db.campaigns.find({"advertiser_id": user["sub"]}).to_list(500)
        camp_ids = [str(c["_id"]) for c in camps]
        query["campaign_id"] = {"$in": camp_ids}
    if campaign_id: 
        query["campaign_id"] = campaign_id
    
    deliverables = await db.deliverables.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(d) for d in deliverables]

@api.put("/admin/deliverables/{del_id}/approve")
async def approve_deliverable(del_id: str, user=Depends(require_admin)):
    d = await db.deliverables.find_one({"_id": ObjectId(del_id), "status": "pending"})
    if not d: 
        raise HTTPException(404, "Entregable no encontrado o ya procesado")
    
    c = await db.campaigns.find_one({"_id": ObjectId(d["campaign_id"])})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada")
    
    payment = c["payment_per_video"]
    creator = await db.users.find_one({"_id": ObjectId(d["creator_id"])})
    commission_rate = 0.35 if creator and creator.get("is_top10") else 0.25
    commission = round(payment * commission_rate, 2)
    creator_total = round(payment - commission, 2)
    
    initial_payout = round(creator_total * 0.40, 2)
    held_payout = round(creator_total * 0.60, 2)
    
    duration_map = {"1_week": 7, "1_month": 30, "6_months": 180}
    days = duration_map.get(c.get("content_duration", "1_month"), 30)
    perm_start = now_iso()
    perm_end = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    await db.deliverables.update_one(
        {"_id": ObjectId(del_id), "status": "pending"}, 
        {"$set": {
            "status": "approved", 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso(), 
            "payout": creator_total, 
            "commission": commission, 
            "initial_payment_released": True, 
            "initial_payout": initial_payout, 
            "held_payout": held_payout, 
            "final_payment_released": False, 
            "bonus_claimed": False, 
            "permanence_start": perm_start, 
            "permanence_end": perm_end
        }}
    )
    
    await db.users.update_one(
        {"_id": ObjectId(d["creator_id"])}, 
        {"$inc": {"balance": initial_payout}}
    )
    await db.campaigns.update_one(
        {"_id": ObjectId(d["campaign_id"])}, 
        {"$inc": {"budget_remaining": -payment, "videos_completed": 1}}
    )
    
    await db.transactions.insert_one({
        "user_id": d["creator_id"], 
        "type": "campaign_payment_initial", 
        "amount": initial_payout, 
        "reference_id": del_id, 
        "description": f"Pago inicial 40% por campaña (comisión {int(commission_rate*100)}%)", 
        "created_at": now_iso()
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", 
        "type": "platform_commission", 
        "amount": commission, 
        "reference_id": del_id, 
        "description": f"Comisión {int(commission_rate*100)}% del creador {d.get('creator_name','')}", 
        "created_at": now_iso()
    })
    
    if creator and creator.get("referred_by"):
        referral_bonus = round(commission * 0.05, 4)
        if referral_bonus > 0:
            await db.users.update_one(
                {"_id": ObjectId(creator["referred_by"])}, 
                {"$inc": {"balance": referral_bonus}}
            )
            await db.transactions.insert_one({
                "user_id": creator["referred_by"], 
                "type": "referral_commission", 
                "amount": referral_bonus, 
                "reference_id": del_id, 
                "description": f"Comisión de referido (5%): {d.get('creator_name','')}", 
                "created_at": now_iso()
            })
    
    updated_c = await db.campaigns.find_one({"_id": ObjectId(d["campaign_id"])})
    if updated_c["videos_completed"] >= updated_c["videos_requested"] or updated_c["budget_remaining"] <= 0:
        await db.campaigns.update_one(
            {"_id": ObjectId(d["campaign_id"])}, 
            {"$set": {"status": "completed"}}
        )
    
    return {
        "message": "Entregable aprobado (40% liberado)", 
        "initial_payout": initial_payout, 
        "held_payout": held_payout, 
        "permanence_end": perm_end
    }

@api.put("/admin/deliverables/{del_id}/reject")
async def reject_deliverable(del_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.deliverables.update_one(
        {"_id": ObjectId(del_id), "status": "pending"}, 
        {"$set": {
            "status": "rejected", 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso(), 
            "admin_note": note
        }}
    )
    if result.modified_count == 0: 
        raise HTTPException(404, "Entregable no encontrado o ya procesado")
    return {"message": "Entregable rechazado"}

# ==================== CLEANUP JOB ====================
async def cleanup_expired_content():
    while True:
        try:
            expired = await db.media_content.find({
                "expires_at": {"$lt": datetime.now()},
                "is_deleted": False
            }).to_list(100)
            
            for media in expired:
                size_mb = media.get("size_mb", 0)
                creator_id = media.get("creator_id")
                
                if creator_id and size_mb > 0:
                    await db.creator_storage.update_one(
                        {"creator_id": creator_id},
                        {"$inc": {"used_mb": -size_mb}}
                    )
                
                try:
                    if media.get("cloudinary_public_id"):
                        cloudinary.uploader.destroy(
                            media["cloudinary_public_id"],
                            resource_type="video" if media["type"] == "video" else "image"
                        )
                except:
                    pass
                
                await db.media_content.update_one(
                    {"_id": media["_id"]},
                    {"$set": {"is_deleted": True, "deleted_at": datetime.now().isoformat()}}
                )
            
            logger.info(f"Limpieza completada: {len(expired)} archivos eliminados")
            await asyncio.sleep(86400)
        except Exception as e:
            logger.error(f"Error en cleanup job: {e}")
            await asyncio.sleep(3600)

# ==================== KYC ====================
@api.post("/kyc")
async def submit_kyc(
    document: UploadFile = File(...), 
    selfie: Optional[UploadFile] = File(None), 
    user=Depends(get_current_user)
):
    doc_url = await save_upload(document)
    selfie_url = ""
    if selfie: 
        selfie_url = await save_upload(selfie)
    
    kyc = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "document_url": doc_url, 
        "selfie_url": selfie_url, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None, 
        "reviewed_at": None, 
        "admin_note": ""
    }
    await db.kyc.delete_many({"user_id": user["sub"], "status": "pending"})
    result = await db.kyc.insert_one(kyc)
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$set": {"kyc_status": "pending"}}
    )
    kyc["_id"] = result.inserted_id
    return serialize_doc(kyc)

@api.get("/kyc")
async def list_kyc(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    kycs = await db.kyc.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(k) for k in kycs]

@api.put("/admin/kyc/{kyc_id}/approve")
async def approve_kyc(kyc_id: str, user=Depends(require_admin)):
    k = await db.kyc.find_one({"_id": ObjectId(kyc_id), "status": "pending"})
    if not k: 
        raise HTTPException(404, "KYC no encontrado o ya procesado")
    
    await db.kyc.update_one(
        {"_id": ObjectId(kyc_id)}, 
        {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    await db.users.update_one(
        {"_id": ObjectId(k["user_id"])}, 
        {"$set": {"kyc_status": "verified"}}
    )
    return {"message": "KYC aprobado"}

@api.put("/admin/kyc/{kyc_id}/reject")
async def reject_kyc(kyc_id: str, note: str = "", user=Depends(require_admin)):
    k = await db.kyc.find_one({"_id": ObjectId(kyc_id), "status": "pending"})
    if not k: 
        raise HTTPException(404, "KYC no encontrado o ya procesado")
    
    await db.kyc.update_one(
        {"_id": ObjectId(kyc_id)}, 
        {"$set": {
            "status": "rejected", 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso(), 
            "admin_note": note
        }}
    )
    await db.users.update_one(
        {"_id": ObjectId(k["user_id"])}, 
        {"$set": {"kyc_status": "rejected"}}
    )
    return {"message": "KYC rechazado"}

# ==================== WITHDRAWALS ====================
class WithdrawalReq(BaseModel):
    amount: float
    method: str = "crypto"
    wallet_address: str = ""
    bank_details: str = ""

@api.post("/withdrawals")
async def request_withdrawal(req: WithdrawalReq, user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if u["kyc_status"] != "verified": 
        raise HTTPException(400, "Debes completar la verificación KYC antes de retirar fondos")
    if req.amount < 10: 
        raise HTTPException(400, "El monto mínimo de retiro es $10")
    if u["balance"] < req.amount: 
        raise HTTPException(400, f"Saldo insuficiente. Tienes ${u['balance']}")
    
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent = await db.withdrawals.count_documents({
        "user_id": user["sub"], 
        "created_at": {"$gte": month_ago}, 
        "status": {"$in": ["pending", "approved"]}
    })
    max_withdrawals = 3 if u.get("is_top10") else 1
    if recent >= max_withdrawals: 
        raise HTTPException(400, f"Límite de retiros alcanzado ({max_withdrawals}/mes)")
    
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$inc": {"balance": -req.amount}}
    )
    
    withdrawal = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "user_name": u.get("name", ""), 
        "amount": req.amount, 
        "method": req.method, 
        "wallet_address": req.wallet_address, 
        "bank_details": req.bank_details, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None, 
        "reviewed_at": None
    }
    result = await db.withdrawals.insert_one(withdrawal)
    await db.transactions.insert_one({
        "user_id": user["sub"], 
        "type": "withdrawal_request", 
        "amount": -req.amount, 
        "reference_id": str(result.inserted_id), 
        "description": f"Solicitud de retiro - {req.method}", 
        "created_at": now_iso()
    })
    withdrawal["_id"] = result.inserted_id
    return serialize_doc(withdrawal)

@api.get("/withdrawals")
async def list_withdrawals(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    wds = await db.withdrawals.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(w) for w in wds]

@api.put("/admin/withdrawals/{wd_id}/approve")
async def approve_withdrawal(wd_id: str, user=Depends(require_admin)):
    w = await db.withdrawals.find_one({"_id": ObjectId(wd_id), "status": "pending"})
    if not w: 
        raise HTTPException(404, "Retiro no encontrado o ya procesado")
    
    await db.withdrawals.update_one(
        {"_id": ObjectId(wd_id)}, 
        {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    return {"message": "Retiro aprobado"}

@api.put("/admin/withdrawals/{wd_id}/reject")
async def reject_withdrawal(wd_id: str, user=Depends(require_admin)):
    w = await db.withdrawals.find_one({"_id": ObjectId(wd_id), "status": "pending"})
    if not w: 
        raise HTTPException(404, "Retiro no encontrado o ya procesado")
    
    await db.users.update_one(
        {"_id": ObjectId(w["user_id"])}, 
        {"$inc": {"balance": w["amount"]}}
    )
    await db.withdrawals.update_one(
        {"_id": ObjectId(wd_id)}, 
        {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    await db.transactions.insert_one({
        "user_id": w["user_id"], 
        "type": "withdrawal_refund", 
        "amount": w["amount"], 
        "reference_id": wd_id, 
        "description": "Retiro rechazado - saldo devuelto", 
        "created_at": now_iso()
    })
    return {"message": "Retiro rechazado, saldo devuelto"}

# ==================== TRANSACTIONS ====================
@api.get("/transactions")
async def list_transactions(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    txns = await db.transactions.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(t) for t in txns]

# ==================== SUBSCRIPTIONS ====================
class SubPlanReq(BaseModel):
    price: float
    description: str = ""

@api.post("/subscriptions/plan")
async def set_subscription_plan(req: SubPlanReq, user=Depends(require_creator)):
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$set": {
            "subscription_plan": {
                "price": req.price, 
                "description": req.description, 
                "active": True
            }
        }}
    )
    return {"message": "Plan de suscripción actualizado"}

@api.post("/subscriptions/subscribe")
async def subscribe_to_creator(creator_id: str = Form(...), user=Depends(get_current_user)):
    creator = await db.users.find_one({"_id": ObjectId(creator_id)})
    if not creator or not creator.get("subscription_plan", {}).get("active"): 
        raise HTTPException(404, "Creador sin plan de suscripción activo")
    
    price = creator["subscription_plan"]["price"]
    fan = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if fan["balance"] < price: 
        raise HTTPException(400, f"Saldo insuficiente. Necesitas ${price}")
    
    existing = await db.subscriptions.find_one({
        "fan_id": user["sub"], 
        "creator_id": creator_id, 
        "active": True
    })
    if existing: 
        raise HTTPException(400, "Ya estás suscrito a este creador")
    
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$inc": {"balance": -price}}
    )
    
    is_top10 = creator.get("is_top10", False)
    rate = 0.35 if is_top10 else 0.25
    commission = round(price * rate, 2)
    payout = round(price - commission, 2)
    
    await db.users.update_one(
        {"_id": ObjectId(creator_id)}, 
        {"$inc": {"balance": payout}}
    )
    
    sub = {
        "fan_id": user["sub"], 
        "creator_id": creator_id, 
        "price": price, 
        "active": True, 
        "created_at": now_iso()
    }
    await db.subscriptions.insert_one(sub)
    
    await db.transactions.insert_one({
        "user_id": user["sub"], 
        "type": "subscription_payment", 
        "amount": -price, 
        "reference_id": creator_id, 
        "description": f"Suscripción a {creator.get('name','')}", 
        "created_at": now_iso()
    })
    await db.transactions.insert_one({
        "user_id": creator_id, 
        "type": "subscription_income", 
        "amount": payout, 
        "reference_id": user["sub"], 
        "description": f"Ingreso por suscripción (comisión {int(rate*100)}%)", 
        "created_at": now_iso()
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", 
        "type": "platform_commission", 
        "amount": commission, 
        "reference_id": creator_id, 
        "description": f"Comisión suscripción {int(rate*100)}%", 
        "created_at": now_iso()
    })
    return {"message": "Suscripción exitosa"}

@api.get("/subscriptions")
async def list_subscriptions(user=Depends(get_current_user)):
    if user["role"] == "creator": 
        subs = await db.subscriptions.find({
            "creator_id": user["sub"], 
            "active": True
        }).to_list(500)
    else: 
        subs = await db.subscriptions.find({
            "fan_id": user["sub"], 
            "active": True
        }).to_list(500)
    
    result = []
    for s in subs:
        s_ser = serialize_doc(s)
        if user["role"] == "creator":
            fan = await db.users.find_one({"_id": ObjectId(s["fan_id"])})
            s_ser["fan_name"] = fan.get("name", "") if fan else ""
        else:
            creator = await db.users.find_one({"_id": ObjectId(s["creator_id"])})
            s_ser["creator_name"] = creator.get("name", "") if creator else ""
        result.append(s_ser)
    return result

# ==================== PREMIUM CONTENT ====================
@api.post("/premium-content")
async def create_premium_content(
    content_type: str = Form("post"), 
    title: str = Form(""), 
    description: str = Form(""), 
    media_url: str = Form(""), 
    media: Optional[UploadFile] = File(None), 
    user=Depends(require_creator)
):
    media_file_url = ""
    if media: 
        media_file_url = await save_upload(media)
    
    content = {
        "creator_id": user["sub"], 
        "content_type": content_type, 
        "title": title, 
        "description": description, 
        "media_url": media_url or media_file_url, 
        "created_at": now_iso()
    }
    result = await db.premium_content.insert_one(content)
    content["_id"] = result.inserted_id
    return serialize_doc(content)

@api.get("/premium-content/{creator_id}")
async def get_premium_content(creator_id: str, user=Depends(get_current_user)):
    if user["sub"] != creator_id and user["role"] != "admin":
        sub = await db.subscriptions.find_one({
            "fan_id": user["sub"], 
            "creator_id": creator_id, 
            "active": True
        })
        if not sub: 
            raise HTTPException(403, "Necesitas una suscripción para ver este contenido")
    
    content = await db.premium_content.find({
        "creator_id": creator_id
    }).sort("created_at", -1).to_list(500)
    return [serialize_doc(c) for c in content]

@api.delete("/premium-content/{content_id}")
async def delete_premium_content(content_id: str, user=Depends(get_current_user)):
    """Elimina un contenido premium (solo el creador propietario o admin)"""
    content = await db.premium_content.find_one({"_id": ObjectId(content_id)})
    if not content:
        raise HTTPException(404, "Contenido no encontrado")
    
    # Verificar permisos
    if content["creator_id"] != user["sub"] and user["role"] != "admin":
        raise HTTPException(403, "No autorizado para eliminar este contenido")
    
    # Eliminar de Cloudinary si tiene public_id
    public_id = content.get("cloudinary_public_id")
    if public_id:
        try:
            resource_type = "video" if content.get("content_type") == "video" else "image"
            cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        except Exception as e:
            logger.error(f"Error eliminando de Cloudinary: {e}")
    
    # Eliminar de la base de datos
    await db.premium_content.delete_one({"_id": ObjectId(content_id)})
    
    # Actualizar almacenamiento del creador
    size_mb = content.get("size_mb", 0)
    if size_mb > 0:
        await db.creator_storage.update_one(
            {"creator_id": content["creator_id"]},
            {"$inc": {"used_mb": -size_mb}}
        )
    
    return {"message": "Contenido eliminado exitosamente"}

# ==================== MUSIC FINANCING ====================
@api.post("/music-financing")
async def request_music_financing(
    title: str = Form(...), 
    description: str = Form(""), 
    amount_requested: float = Form(0), 
    genre: str = Form(""), 
    streaming_stats: str = Form(""), 
    audio: Optional[UploadFile] = File(None), 
    user=Depends(require_creator)
):
    audio_url = ""
    if audio: 
        audio_url = await save_upload(audio)
    
    req_doc = {
        "creator_id": user["sub"], 
        "creator_email": user["email"], 
        "title": title, 
        "description": description, 
        "amount_requested": amount_requested, 
        "genre": genre, 
        "streaming_stats": streaming_stats, 
        "audio_url": audio_url, 
        "status": "pending", 
        "admin_message": "", 
        "created_at": now_iso(), 
        "reviewed_by": None, 
        "reviewed_at": None
    }
    result = await db.music_financing.insert_one(req_doc)
    req_doc["_id"] = result.inserted_id
    return serialize_doc(req_doc)

@api.get("/music-financing")
async def list_music_financing(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"creator_id": user["sub"]}
    reqs = await db.music_financing.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(r) for r in reqs]

@api.put("/admin/music-financing/{req_id}/approve")
async def approve_financing(req_id: str, message: str = "", amount: float = 0, user=Depends(require_admin)):
    r = await db.music_financing.find_one({"_id": ObjectId(req_id), "status": "pending"})
    if not r: 
        raise HTTPException(404, "Solicitud no encontrada o ya procesada")
    
    final_amount = amount if amount > 0 else r["amount_requested"]
    await db.music_financing.update_one(
        {"_id": ObjectId(req_id)}, 
        {"$set": {
            "status": "approved", 
            "admin_message": message, 
            "amount_approved": final_amount, 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso()
        }}
    )
    await db.users.update_one(
        {"_id": ObjectId(r["creator_id"])}, 
        {"$inc": {"balance": final_amount}}
    )
    await db.transactions.insert_one({
        "user_id": r["creator_id"], 
        "type": "music_financing", 
        "amount": final_amount, 
        "reference_id": req_id, 
        "description": f"Financiamiento musical: {r['title']}", 
        "created_at": now_iso()
    })
    return {"message": "Financiamiento aprobado", "amount": final_amount}

@api.put("/admin/music-financing/{req_id}/reject")
async def reject_financing(req_id: str, message: str = "", user=Depends(require_admin)):
    result = await db.music_financing.update_one(
        {"_id": ObjectId(req_id), "status": "pending"}, 
        {"$set": {
            "status": "rejected", 
            "admin_message": message, 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso()
        }}
    )
    if result.modified_count == 0: 
        raise HTTPException(404, "Solicitud no encontrada o ya procesada")
    return {"message": "Financiamiento rechazado"}

# ==================== RANKINGS ====================
@api.get("/rankings")
async def get_rankings():
    rankings = await db.rankings.find({}).sort("category", 1).to_list(200)
    if not rankings: 
        return await generate_rankings()
    return [serialize_doc(r) for r in rankings]

async def generate_rankings():
    creators = await db.users.find({
        "role": "creator", 
        "creator_profile": {"$ne": None}
    }).to_list(500)
    
    categories = {}
    for c in creators:
        cp = c.get("creator_profile", {})
        if not cp: 
            continue
        entry = {
            "user_id": str(c["_id"]), 
            "name": c.get("name", ""), 
            "followers": cp.get("followers", 0), 
            "avg_views": cp.get("avg_views", 0), 
            "niche": cp.get("niche", ""), 
            "region": cp.get("region", "")
        }
        for cat in ["most_viewed", "most_followers"]:
            if cat not in categories: 
                categories[cat] = []
            categories[cat].append(entry)
    
    result = []
    sort_keys = {"most_viewed": "avg_views", "most_followers": "followers"}
    cat_labels = {"most_viewed": "Los 10 Más Vistos", "most_followers": "Los 10 Con Más Seguidores"}
    
    for cat, entries in categories.items():
        sorted_entries = sorted(
            entries, 
            key=lambda x: x.get(sort_keys.get(cat, "followers"), 0), 
            reverse=True
        )[:10]
        result.append({
            "category": cat, 
            "label": cat_labels.get(cat, cat), 
            "entries": sorted_entries
        })
    return result

@api.post("/admin/rankings/recalculate")
async def recalculate_rankings(user=Depends(require_admin)):
    await db.rankings.drop()
    rankings = await generate_rankings()
    if rankings:
        for r in rankings: 
            await db.rankings.insert_one(r)
    return {"message": "Rankings recalculados", "count": len(rankings)}

# ==================== ADMIN STATS ====================
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_creators = await db.users.count_documents({"role": "creator"})
    total_advertisers = await db.users.count_documents({"role": "advertiser"})
    total_fans = await db.users.count_documents({"role": "fan"})
    
    pending_deposits = await db.deposits.count_documents({"status": "pending"})
    pending_kyc = await db.kyc.count_documents({"status": "pending"})
    pending_deliverables = await db.deliverables.count_documents({"status": "pending"})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    pending_financing = await db.music_financing.count_documents({"status": "pending"})
    pending_curator = await db.curator_requests.count_documents({"status": "pending"})
    pending_micro_tasks = await db.micro_tasks.count_documents({"status": "pending"})
    pending_level_requests = await db.level_requests.count_documents({"status": "pending"})
    pending_final_release = await db.deliverables.count_documents({
        "status": "approved", 
        "final_payment_released": False
    })
    
    platform_txns = await db.transactions.find({
        "user_id": "__platform__", 
        "type": "platform_commission"
    }).to_list(10000)
    total_commissions = sum(t["amount"] for t in platform_txns)
    
    approved_deposits = await db.deposits.find({"status": "approved"}).to_list(10000)
    total_deposited = sum(d["amount"] for d in approved_deposits)
    
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    
    return {
        "total_users": total_users, 
        "total_creators": total_creators, 
        "total_advertisers": total_advertisers, 
        "total_fans": total_fans, 
        "pending_deposits": pending_deposits, 
        "pending_kyc": pending_kyc, 
        "pending_deliverables": pending_deliverables, 
        "pending_withdrawals": pending_withdrawals, 
        "pending_financing": pending_financing, 
        "pending_curator": pending_curator, 
        "pending_micro_tasks": pending_micro_tasks, 
        "pending_level_requests": pending_level_requests, 
        "pending_final_release": pending_final_release, 
        "total_commissions": round(total_commissions, 2), 
        "total_deposited": round(total_deposited, 2), 
        "active_campaigns": active_campaigns
    }

# ==================== ADMIN USERS ====================
@api.get("/admin/users")
async def admin_list_users(role: str = Query(None), user=Depends(require_admin)):
    query = {}
    if role: 
        query["role"] = role
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [serialize_doc(u) for u in users]

@api.put("/admin/users/{user_id}/role")
async def admin_change_role(user_id: str, role: str = Form(...), user=Depends(require_admin)):
    if role not in ["fan", "advertiser", "creator", "admin"]: 
        raise HTTPException(400, "Rol inválido")
    await db.users.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"role": role}}
    )
    return {"message": f"Rol cambiado a {role}"}

@api.put("/admin/users/{user_id}/top10")
async def admin_toggle_top10(user_id: str, is_top10: bool = Form(...), user=Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"is_top10": is_top10}}
    )
    return {"message": f"Top 10: {'Sí' if is_top10 else 'No'}"}

# ==================== PUBLIC EXPLORE ====================
@api.get("/explore/creators")
async def explore_creators(niche: str = Query(None), region: str = Query(None)):
    query = {"role": "creator", "creator_profile": {"$ne": None}}
    creators = await db.users.find(query, {"password_hash": 0}).to_list(500)
    result = []
    for c in creators:
        cp = c.get("creator_profile", {})
        if niche and cp.get("niche") != niche: 
            continue
        if region and cp.get("region") != region: 
            continue
        result.append(serialize_doc(c))
    return result

@api.get("/explore/creators/{creator_id}")
async def get_creator_public(creator_id: str):
    c = await db.users.find_one({"_id": ObjectId(creator_id)}, {"password_hash": 0})
    if not c: 
        raise HTTPException(404, "Creador no encontrado")
    return serialize_doc(c)

# ==================== PAYMENT INFO ====================
@api.get("/payment-info")
async def get_payment_info(user=Depends(get_current_user)):
    s = await db.platform_settings.find_one({})
    if not s: 
        return {}
    return {
        "crypto_wallet_address": s.get("crypto_wallet_address", ""), 
        "crypto_network": s.get("crypto_network", ""), 
        "crypto_currency": s.get("crypto_currency", ""), 
        "bank_name": s.get("bank_name", ""), 
        "bank_account_holder": s.get("bank_account_holder", ""), 
        "bank_account_number": s.get("bank_account_number", ""), 
        "bank_details": s.get("bank_details", ""), 
        "instructions": s.get("instructions", "")
    }

# ==================== SPOTIFY CURATORS ====================
CURATOR_RATES = {
    (10, 1000): 9.0, 
    (25, 1000): 22.0, 
    (10, 500): 4.0, 
    (5, 500): 2.0, 
    (10, 100): 0.30
}

@api.post("/curator/playlist")
async def register_playlist(
    playlist_url: str = Form(...), 
    playlist_name: str = Form(""), 
    song_count: int = Form(...), 
    followers: int = Form(0), 
    user=Depends(require_creator)
):
    if song_count < 5 or song_count > 25: 
        raise HTTPException(400, "La playlist debe tener entre 5 y 25 canciones")
    if followers < 10: 
        raise HTTPException(400, "La playlist debe tener al menos 10 seguidores/me gusta")
    
    playlist = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "playlist_url": playlist_url, 
        "playlist_name": playlist_name, 
        "song_count": song_count, 
        "followers": followers, 
        "status": "active", 
        "created_at": now_iso()
    }
    result = await db.curator_playlists.insert_one(playlist)
    playlist["_id"] = result.inserted_id
    return serialize_doc(playlist)

@api.get("/curator/playlists")
async def list_playlists(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    playlists = await db.curator_playlists.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(p) for p in playlists]

@api.post("/curator/payment-request")
async def curator_payment_request(
    playlist_id: str = Form(...), 
    listens_count: int = Form(...), 
    evidence_description: str = Form(""), 
    evidence: Optional[UploadFile] = File(None), 
    user=Depends(require_creator)
):
    playlist = await db.curator_playlists.find_one({
        "_id": ObjectId(playlist_id), 
        "user_id": user["sub"]
    })
    if not playlist: 
        raise HTTPException(404, "Playlist no encontrada")
    
    evidence_url = ""
    if evidence: 
        evidence_url = await save_upload(evidence)
    
    songs = playlist["song_count"]
    payout = 0.0
    for (s, l), rate in sorted(CURATOR_RATES.items(), key=lambda x: (-x[0][1], -x[0][0])):
        if songs >= s and listens_count >= l: 
            payout = rate
            break
    if payout == 0 and songs >= 5 and listens_count >= 100: 
        payout = round(0.30 * (listens_count / 100) * (songs / 10), 2)
    
    request = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "playlist_id": playlist_id, 
        "playlist_name": playlist.get("playlist_name", ""), 
        "song_count": songs, 
        "listens_count": listens_count, 
        "calculated_payout": payout, 
        "evidence_url": evidence_url, 
        "evidence_description": evidence_description, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None
    }
    result = await db.curator_requests.insert_one(request)
    request["_id"] = result.inserted_id
    return serialize_doc(request)

@api.get("/curator/requests")
async def list_curator_requests(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    requests = await db.curator_requests.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(r) for r in requests]

@api.put("/admin/curator/requests/{req_id}/approve")
async def approve_curator_request(req_id: str, user=Depends(require_admin)):
    r = await db.curator_requests.find_one({"_id": ObjectId(req_id), "status": "pending"})
    if not r: 
        raise HTTPException(404, "Solicitud no encontrada o ya procesada")
    
    payout = r["calculated_payout"]
    await db.curator_requests.update_one(
        {"_id": ObjectId(req_id)}, 
        {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    await db.users.update_one(
        {"_id": ObjectId(r["user_id"])}, 
        {"$inc": {"balance": payout}}
    )
    await db.transactions.insert_one({
        "user_id": r["user_id"], 
        "type": "curator_payment", 
        "amount": payout, 
        "reference_id": req_id, 
        "description": f"Pago curador: {r['playlist_name']} ({r['listens_count']} escuchas)", 
        "created_at": now_iso()
    })
    return {"message": "Solicitud de curador aprobada", "payout": payout}

@api.put("/admin/curator/requests/{req_id}/reject")
async def reject_curator_request(req_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.curator_requests.update_one(
        {"_id": ObjectId(req_id), "status": "pending"}, 
        {"$set": {
            "status": "rejected", 
            "reviewed_by": user["sub"], 
            "reviewed_at": now_iso(), 
            "admin_note": note
        }}
    )
    if result.modified_count == 0: 
        raise HTTPException(404, "Solicitud no encontrada")
    return {"message": "Solicitud rechazada"}

# ==================== MICRO-TASKS ====================
@api.post("/micro-tasks")
async def submit_micro_task(
    songs_listened: int = Form(5), 
    comment: str = Form(""), 
    evidence: Optional[UploadFile] = File(None), 
    user=Depends(get_current_user)
):
    evidence_url = ""
    if evidence: 
        evidence_url = await save_upload(evidence)
    
    payout = round(0.02 * (songs_listened / 5), 2)
    task = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "songs_listened": songs_listened, 
        "comment": comment, 
        "evidence_url": evidence_url, 
        "calculated_payout": payout, 
        "status": "pending", 
        "created_at": now_iso(), 
        "reviewed_by": None
    }
    result = await db.micro_tasks.insert_one(task)
    task["_id"] = result.inserted_id
    return serialize_doc(task)

@api.get("/micro-tasks")
async def list_micro_tasks(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    tasks = await db.micro_tasks.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(t) for t in tasks]

@api.put("/admin/micro-tasks/{task_id}/approve")
async def approve_micro_task(task_id: str, user=Depends(require_admin)):
    t = await db.micro_tasks.find_one({"_id": ObjectId(task_id), "status": "pending"})
    if not t: 
        raise HTTPException(404, "Tarea no encontrada o ya procesada")
    
    payout = t["calculated_payout"]
    await db.micro_tasks.update_one(
        {"_id": ObjectId(task_id)}, 
        {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    await db.users.update_one(
        {"_id": ObjectId(t["user_id"])}, 
        {"$inc": {"balance": payout}}
    )
    await db.transactions.insert_one({
        "user_id": t["user_id"], 
        "type": "micro_task_payment", 
        "amount": payout, 
        "reference_id": task_id, 
        "description": f"Micro-tarea: {t['songs_listened']} canciones escuchadas", 
        "created_at": now_iso()
    })
    return {"message": "Tarea aprobada", "payout": payout}

@api.put("/admin/micro-tasks/{task_id}/reject")
async def reject_micro_task(task_id: str, user=Depends(require_admin)):
    result = await db.micro_tasks.update_one(
        {"_id": ObjectId(task_id), "status": "pending"}, 
        {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    if result.modified_count == 0: 
        raise HTTPException(404, "Tarea no encontrada")
    return {"message": "Tarea rechazada"}

# ==================== DELIVERABLE: RELEASE FINAL PAYMENT ====================
@api.put("/admin/deliverables/{del_id}/release-final")
async def release_final_payment(del_id: str, user=Depends(require_admin)):
    d = await db.deliverables.find_one({
        "_id": ObjectId(del_id), 
        "status": "approved", 
        "final_payment_released": False
    })
    if not d: 
        raise HTTPException(404, "Entregable no encontrado o pago ya liberado")
    
    held = d.get("held_payout", 0)
    if held <= 0: 
        raise HTTPException(400, "No hay pago pendiente")
    
    await db.users.update_one(
        {"_id": ObjectId(d["creator_id"])}, 
        {"$inc": {"balance": held}}
    )
    await db.deliverables.update_one(
        {"_id": ObjectId(del_id)}, 
        {"$set": {"final_payment_released": True}}
    )
    await db.transactions.insert_one({
        "user_id": d["creator_id"], 
        "type": "campaign_payment_final", 
        "amount": held, 
        "reference_id": del_id, 
        "description": f"Pago final 60% - permanencia cumplida", 
        "created_at": now_iso()
    })
    return {"message": f"Pago final de ${held} liberado"}

# ==================== DELIVERABLE: CLAIM BONUS ====================
@api.put("/deliverables/{del_id}/claim-bonus")
async def claim_bonus(del_id: str, user=Depends(get_current_user)):
    d = await db.deliverables.find_one({
        "_id": ObjectId(del_id), 
        "status": "approved", 
        "bonus_claimed": False
    })
    if not d: 
        raise HTTPException(404, "Entregable no encontrado o bonus ya reclamado")
    if d["creator_id"] != user["sub"] and user["role"] != "admin": 
        raise HTTPException(403, "No autorizado")
    
    c = await db.campaigns.find_one({"_id": ObjectId(d["campaign_id"])})
    bonus = c.get("bonus_amount", 0) if c else 0
    if bonus <= 0: 
        raise HTTPException(400, "Esta campaña no tiene bonus")
    
    creator = await db.users.find_one({"_id": ObjectId(d["creator_id"])})
    commission_rate = 0.35 if creator and creator.get("is_top10") else 0.25
    bonus_commission = round(bonus * commission_rate, 2)
    bonus_payout = round(bonus - bonus_commission, 2)
    
    await db.users.update_one(
        {"_id": ObjectId(d["creator_id"])}, 
        {"$inc": {"balance": bonus_payout}}
    )
    await db.deliverables.update_one(
        {"_id": ObjectId(del_id)}, 
        {"$set": {"bonus_claimed": True}}
    )
    await db.campaigns.update_one(
        {"_id": ObjectId(d["campaign_id"])}, 
        {"$inc": {"budget_remaining": -bonus}}
    )
    await db.transactions.insert_one({
        "user_id": d["creator_id"], 
        "type": "bonus_payment", 
        "amount": bonus_payout, 
        "reference_id": del_id, 
        "description": f"Bonus reclamado (comisión {int(commission_rate*100)}%)", 
        "created_at": now_iso()
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", 
        "type": "platform_commission", 
        "amount": bonus_commission, 
        "reference_id": del_id, 
        "description": f"Comisión bonus {int(commission_rate*100)}%", 
        "created_at": now_iso()
    })
    return {"message": f"Bonus de ${bonus_payout} reclamado"}

# ==================== LEVEL UP REQUEST ====================
@api.post("/creator/level-request")
async def request_level_up(
    requested_level: str = Form(...), 
    justification: str = Form(""), 
    portfolio_links: str = Form(""), 
    user=Depends(require_creator)
):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if u.get("level_request_pending"): 
        raise HTTPException(400, "Ya tienes una solicitud de nivel pendiente")
    
    req_doc = {
        "user_id": user["sub"], 
        "user_email": user["email"], 
        "user_name": u.get("name", ""), 
        "current_level": u.get("creator_profile", {}).get("creator_level", "standard") if u.get("creator_profile") else "standard", 
        "requested_level": requested_level, 
        "justification": justification, 
        "portfolio_links": portfolio_links, 
        "status": "pending", 
        "created_at": now_iso()
    }
    await db.level_requests.insert_one(req_doc)
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$set": {"level_request_pending": True}}
    )
    return {"message": "Solicitud de nivel enviada"}

@api.get("/creator/level-requests")
async def list_level_requests(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    reqs = await db.level_requests.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(r) for r in reqs]

@api.put("/admin/level-requests/{req_id}/approve")
async def approve_level_request(req_id: str, user=Depends(require_admin)):
    r = await db.level_requests.find_one({"_id": ObjectId(req_id), "status": "pending"})
    if not r: 
        raise HTTPException(404, "Solicitud no encontrada")
    
    await db.level_requests.update_one(
        {"_id": ObjectId(req_id)}, 
        {"$set": {"status": "approved"}}
    )
    await db.users.update_one(
        {"_id": ObjectId(r["user_id"])}, 
        {"$set": {
            "level_request_pending": False, 
            "creator_profile.creator_level": r["requested_level"]
        }}
    )
    return {"message": f"Nivel actualizado a {r['requested_level']}"}

@api.put("/admin/level-requests/{req_id}/reject")
async def reject_level_request(req_id: str, user=Depends(require_admin)):
    r = await db.level_requests.find_one({"_id": ObjectId(req_id), "status": "pending"})
    if not r: 
        raise HTTPException(404, "Solicitud no encontrada")
    
    await db.level_requests.update_one(
        {"_id": ObjectId(req_id)}, 
        {"$set": {"status": "rejected"}}
    )
    await db.users.update_one(
        {"_id": ObjectId(r["user_id"])}, 
        {"$set": {"level_request_pending": False}}
    )
    return {"message": "Solicitud rechazada"}

# ==================== PROFILE PHOTO ====================
@api.post("/auth/profile-photo")
async def upload_profile_photo(photo: UploadFile = File(...), user=Depends(get_current_user)):
    photo_url = await save_upload(photo)
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])}, 
        {"$set": {"profile_photo_url": photo_url}}
    )
    return {"message": "Foto actualizada", "url": photo_url}

# ==================== REFERRAL INFO ====================
@api.get("/referrals")
async def get_referral_info(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    referral_code = u.get("referral_code", "")
    referrals = await db.users.find({"referred_by": user["sub"]}).to_list(500)
    ref_txns = await db.transactions.find({
        "user_id": user["sub"], 
        "type": "referral_commission"
    }).to_list(1000)
    total_ref_earnings = sum(t["amount"] for t in ref_txns)
    
    return {
        "referral_code": referral_code, 
        "referrals_count": len(referrals), 
        "referrals": [
            {"name": r.get("name", ""), "email": r.get("email", ""), "created_at": r.get("created_at", "")} 
            for r in referrals
        ], 
        "total_referral_earnings": round(total_ref_earnings, 4)
    }

# ==================== ADMIN: WALLET ====================
@api.get("/admin/wallet")
async def admin_wallet(user=Depends(require_admin)):
    txns = await db.transactions.find({"user_id": "__platform__"}).sort("created_at", -1).to_list(5000)
    total = sum(t["amount"] for t in txns)
    return {
        "total_commissions": round(total, 2), 
        "transactions": [serialize_doc(t) for t in txns]
    }

# ==================== ADMIN: CUSTOM RANKING BOARDS ====================
@api.post("/admin/ranking-boards")
async def create_ranking_board(
    name: str = Form(...), 
    description: str = Form(""), 
    user=Depends(require_admin)
):
    board = {
        "name": name, 
        "description": description, 
        "entries": [], 
        "created_at": now_iso()
    }
    result = await db.ranking_boards.insert_one(board)
    return {"message": "Tablero creado", "id": str(result.inserted_id)}

@api.get("/ranking-boards")
async def list_ranking_boards():
    boards = await db.ranking_boards.find({}).sort("created_at", -1).to_list(100)
    return [serialize_doc(b) for b in boards]

@api.put("/admin/ranking-boards/{board_id}/add-creator")
async def add_creator_to_board(
    board_id: str, 
    creator_id: str = Form(...), 
    user=Depends(require_admin)
):
    creator = await db.users.find_one({"_id": ObjectId(creator_id)})
    if not creator: 
        raise HTTPException(404, "Creador no encontrado")
    
    entry = {
        "user_id": creator_id, 
        "name": creator.get("name", ""), 
        "added_at": now_iso()
    }
    await db.ranking_boards.update_one(
        {"_id": ObjectId(board_id)}, 
        {"$push": {"entries": entry}}
    )
    return {"message": "Creador agregado al tablero"}

# ==================== ADMIN: SET CREATOR LEVEL ====================
@api.put("/admin/users/{user_id}/level")
async def admin_set_level(user_id: str, level: str = Form(...), user=Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"creator_profile.creator_level": level}}
    )
    return {"message": f"Nivel actualizado a {level}"}

# ==================== CLOUDINARY SIGN UPLOAD ====================
@api.post("/cloudinary/sign-upload")
async def sign_upload(current_user=Depends(get_current_user)):
    """Genera firma para subir archivos directamente a Cloudinary desde el frontend"""
    try:
        timestamp = int(datetime.now().timestamp())
        folder = f"familyfansmony/{current_user['role']}/{current_user['sub']}"
        
        params = {
            "timestamp": timestamp,
            "folder": folder,
            "resource_type": "auto",
        }
        
        signature = cloudinary.utils.api_sign_request(params, cloudinary.config().api_secret)
        
        return {
            "signature": signature,
            "timestamp": timestamp,
            "api_key": cloudinary.config().api_key,
            "cloud_name": cloudinary.config().cloud_name,
            "folder": folder
        }
    except Exception as e:
        logger.error(f"Error generando firma Cloudinary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al generar firma: {str(e)}")

# ==================== CLOUDINARY WEBHOOK ====================
@api.post("/cloudinary/webhook")
async def cloudinary_webhook(request: Request):
    """Webhook para notificaciones de Cloudinary"""
    try:
        data = await request.json()
        event_type = data.get("event_type")
        public_id = data.get("public_id")
        
        if event_type == "delete":
            await db.media_content.update_many(
                {"cloudinary_public_id": public_id},
                {"$set": {"is_deleted": True, "deleted_at": now_iso()}}
            )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error en webhook Cloudinary: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== CLOUDINARY USAGE (admin) ====================
@api.get("/cloudinary/usage")
async def get_cloudinary_usage(current_user=Depends(require_admin)):
    """Obtiene estadísticas de uso de Cloudinary"""
    try:
        usage = cloudinary.api.usage()
        return {
            "used": usage.get("usage", {}),
            "last_updated": usage.get("last_updated")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener uso: {str(e)}")

# ==================== MEDIA UPLOAD (VIDEO) ====================
@api.post("/media/upload/video")
async def upload_video(
    file: UploadFile = File(...),
    folder: str = Form(default="campaigns"),
    current_user=Depends(get_current_user)
):
    """Sube un video a Cloudinary (procesado por el backend)"""
    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Tipo de archivo no permitido. Solo videos MP4, MOV, AVI o WebM")
    
    max_size = 500 * 1024 * 1024  # 500MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(400, "El video no puede superar los 500MB")
    
    public_id = f"{current_user['sub']}/{folder}/{uuid.uuid4().hex}"
    
    try:
        upload_result = cloudinary.uploader.upload(
            content,
            resource_type="video",
            public_id=public_id,
            folder=folder,
            chunk_size=6000000,
            eager=[
                {"width": 1920, "height": 1080, "crop": "limit", "format": "mp4"},
                {"width": 1280, "height": 720, "crop": "limit", "format": "mp4"},
                {"width": 640, "height": 360, "crop": "limit", "format": "mp4"}
            ],
            eager_async=True
        )
        
        return {
            "success": True,
            "public_id": upload_result.get("public_id"),
            "url": upload_result.get("secure_url"),
            "format": upload_result.get("format"),
            "duration": upload_result.get("duration"),
            "bytes": upload_result.get("bytes"),
            "width": upload_result.get("width"),
            "height": upload_result.get("height"),
            "resource_type": upload_result.get("resource_type")
        }
    except Exception as e:
        raise HTTPException(500, f"Error al subir video: {str(e)}")

# ==================== MEDIA UPLOAD (IMAGE) ====================
@api.post("/media/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form(default="profiles"),
    current_user=Depends(get_current_user)
):
    """Sube una imagen a Cloudinary"""
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Tipo de archivo no permitido. Solo JPEG, PNG o WebP")
    
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(400, "La imagen no puede superar los 10MB")
    
    public_id = f"{current_user['sub']}/{folder}/{uuid.uuid4().hex}"
    
    try:
        upload_result = cloudinary.uploader.upload(
            content,
            public_id=public_id,
            folder=folder,
            transformation=[
                {"width": 1920, "height": 1080, "crop": "limit", "quality": "auto"},
                {"width": 800, "height": 600, "crop": "limit", "quality": "auto"}
            ]
        )
        
        return {
            "success": True,
            "public_id": upload_result.get("public_id"),
            "url": upload_result.get("secure_url"),
            "format": upload_result.get("format"),
            "bytes": upload_result.get("bytes"),
            "width": upload_result.get("width"),
            "height": upload_result.get("height")
        }
    except Exception as e:
        raise HTTPException(500, f"Error al subir imagen: {str(e)}")

# ==================== MEDIA SIGNED URL ====================
@api.get("/media/signed-url/{public_id}")
async def get_signed_url(
    public_id: str,
    resource_type: str = Query(default="video", regex="^(video|image)$"),
    expires_in: int = Query(default=3600, ge=300, le=86400),
    current_user=Depends(get_current_user)
):
    """Genera una URL firmada para acceder a un recurso de Cloudinary"""
    try:
        expiration_time = int(datetime.now().timestamp()) + expires_in
        url = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type=resource_type,
            secure=True,
            sign_url=True,
            expires_at=expiration_time
        )[0]
        return {"url": url, "expires_in": expires_in}
    except Exception as e:
        raise HTTPException(500, f"Error generando URL firmada: {str(e)}")

# ==================== MEDIA DELETE ====================
@api.delete("/media/delete/{public_id}")
async def delete_media(
    public_id: str,
    resource_type: str = Query(default="video", regex="^(video|image)$"),
    current_user=Depends(get_current_user)
):
    """Elimina un recurso de Cloudinary (solo el propietario)"""
    if not public_id.startswith(current_user['sub']):
        raise HTTPException(403, "No tienes permiso para eliminar este recurso")
    
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return {"success": True, "result": result.get("result")}
    except Exception as e:
        raise HTTPException(500, f"Error al eliminar recurso: {str(e)}")

# ==================== CHAT ENDPOINTS ====================

@api.post("/chat/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    message: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Envía un mensaje de chat a otro usuario"""
    sender_id = current_user["sub"]
    recipient_id = message.recipient_id
    
    # Validar que el destinatario existe
    recipient = await db.users.find_one({"_id": ObjectId(recipient_id)})
    if not recipient:
        raise HTTPException(404, "Destinatario no encontrado")
    
    # Si es contenido de pago, validar precio
    if message.is_paid:
        if not message.price or message.price <= 0:
            raise HTTPException(400, "Precio requerido para contenido de pago")
    
    # Crear mensaje
    chat_message = {
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "type": message.type,
        "content": message.content,
        "is_paid": message.is_paid,
        "price": message.price,
        "is_blurred": message.is_paid,
        "duration": message.duration,
        "cloudinary_public_id": message.cloudinary_public_id,
        "created_at": datetime.now(timezone.utc),
        "read_at": None,
        "paid_by": []
    }
    
    result = await db.chat_messages.insert_one(chat_message)
    chat_message["_id"] = result.inserted_id
    
    # Obtener nombre del sender para respuesta
    sender = await db.users.find_one({"_id": ObjectId(sender_id)})
    
    response = ChatMessageResponse(
        id=str(result.inserted_id),
        sender_id=sender_id,
        sender_name=sender.get("name", ""),
        recipient_id=recipient_id,
        type=message.type,
        content=message.content,
        is_paid=message.is_paid,
        price=message.price,
        is_blurred=message.is_paid,
        duration=message.duration,
        cloudinary_public_id=message.cloudinary_public_id,
        created_at=chat_message["created_at"],
        read_at=None
    )
    return response

@api.get("/chat/conversations", response_model=List[ChatConversation])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Obtiene todas las conversaciones del usuario actual"""
    user_id = current_user["sub"]
    
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": user_id},
                    {"recipient_id": user_id}
                ]
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user_id]},
                        "$recipient_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$content"},
                "last_message_at": {"$first": "$created_at"},
                "last_message_type": {"$first": "$type"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$eq": ["$recipient_id", user_id]},
                                    {"$eq": ["$read_at", None]}
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user_info"
            }
        },
        {
            "$unwind": "$user_info"
        },
        {
            "$project": {
                "other_user_id": {"$toString": "$_id"},
                "other_user_name": "$user_info.name",
                "other_user_photo": "$user_info.profile_photo_url",
                "last_message": 1,
                "last_message_at": 1,
                "unread_count": 1
            }
        },
        {
            "$sort": {"last_message_at": -1}
        }
    ]
    
    conversations = await db.chat_messages.aggregate(pipeline).to_list(None)
    return [ChatConversation(**conv) for conv in conversations]

@api.get("/chat/messages/{other_user_id}", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    other_user_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene los mensajes entre el usuario actual y otro usuario"""
    user_id = current_user["sub"]
    
    query = {
        "$or": [
            {"sender_id": user_id, "recipient_id": other_user_id},
            {"sender_id": other_user_id, "recipient_id": user_id}
        ]
    }
    
    if before:
        query["created_at"] = {"$lt": datetime.fromisoformat(before)}
    
    messages_cursor = db.chat_messages.find(query).sort("created_at", -1).limit(limit)
    messages = await messages_cursor.to_list(length=limit)
    messages.reverse()
    
    # Marcar mensajes recibidos como leídos
    await db.chat_messages.update_many(
        {"recipient_id": user_id, "sender_id": other_user_id, "read_at": None},
        {"$set": {"read_at": datetime.now(timezone.utc)}}
    )
    
    # Obtener nombres de usuarios
    sender_ids = list(set([m["sender_id"] for m in messages]))
    users = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in sender_ids]}}).to_list(None)
    user_names = {str(u["_id"]): u.get("name", "") for u in users}
    
    result = []
    for msg in messages:
        is_paid_by_me = user_id in msg.get("paid_by", [])
        result.append(ChatMessageResponse(
            id=str(msg["_id"]),
            sender_id=msg["sender_id"],
            sender_name=user_names.get(msg["sender_id"], ""),
            recipient_id=msg["recipient_id"],
            type=msg["type"],
            content=msg["content"],
            is_paid=msg["is_paid"],
            price=msg.get("price"),
            is_blurred=msg["is_paid"] and not is_paid_by_me,
            duration=msg.get("duration"),
            cloudinary_public_id=msg.get("cloudinary_public_id"),
            created_at=msg["created_at"],
            read_at=msg.get("read_at")
        ))
    return result

@api.put("/chat/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marca un mensaje como leído"""
    result = await db.chat_messages.update_one(
        {"_id": ObjectId(message_id), "recipient_id": current_user["sub"]},
        {"$set": {"read_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Mensaje no encontrado o ya leído")
    return {"status": "ok"}

@api.post("/chat/pay")
async def pay_for_chat_content(
    payment: PaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Paga para desbloquear contenido de pago en chat"""
    message = await db.chat_messages.find_one({"_id": ObjectId(payment.message_id)})
    if not message:
        raise HTTPException(404, "Mensaje no encontrado")
    
    if not message.get("is_paid"):
        raise HTTPException(400, "Este mensaje no es de pago")
    
    user_id = current_user["sub"]
    if user_id in message.get("paid_by", []):
        raise HTTPException(400, "Ya has pagado por este contenido")
    
    price = message["price"]
    sender_id = message["sender_id"]
    
    # Verificar saldo del fan
    fan = await db.users.find_one({"_id": ObjectId(user_id)})
    if fan["balance"] < price:
        raise HTTPException(400, f"Saldo insuficiente. Necesitas ${price}")
    
    # Descontar saldo del fan
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"balance": -price}}
    )
    
    # Calcular comisión
    creator = await db.users.find_one({"_id": ObjectId(sender_id)})
    commission_rate = 0.35 if creator.get("is_top10") else 0.25
    commission = round(price * commission_rate, 2)
    creator_payout = round(price - commission, 2)
    
    # Acreditar al creador
    await db.users.update_one(
        {"_id": ObjectId(sender_id)},
        {"$inc": {"balance": creator_payout}}
    )
    
    # Registrar transacciones
    await db.transactions.insert_one({
        "user_id": user_id,
        "type": "chat_payment",
        "amount": -price,
        "reference_id": str(message["_id"]),
        "description": f"Pago por contenido en chat de {creator.get('name', 'creador')}",
        "created_at": now_iso()
    })
    
    await db.transactions.insert_one({
        "user_id": sender_id,
        "type": "chat_income",
        "amount": creator_payout,
        "reference_id": str(message["_id"]),
        "description": "Ingreso por contenido en chat",
        "created_at": now_iso()
    })
    
    await db.transactions.insert_one({
        "user_id": "__platform__",
        "type": "platform_commission",
        "amount": commission,
        "reference_id": str(message["_id"]),
        "description": f"Comisión chat {int(commission_rate*100)}%",
        "created_at": now_iso()
    })
    
    # Marcar como pagado
    await db.chat_messages.update_one(
        {"_id": ObjectId(payment.message_id)},
        {"$addToSet": {"paid_by": user_id}}
    )
    
    return {"message": "Contenido desbloqueado", "price": price}

# ==================== STATIC FILES & MIDDLEWARE ====================
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
