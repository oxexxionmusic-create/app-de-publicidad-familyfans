from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, aiofiles, random, string
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin, require_advertiser, require_creator
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'familyfansmony')]

app = FastAPI(title="Family Fans Mony API")
api = APIRouter(prefix="/api")

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Helpers ---
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

# --- Admin seed ---
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
    # Seed default settings
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
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code")
    await db.campaigns.create_index("status")
    await db.deposits.create_index("status")
    await db.transactions.create_index("user_id")
    
    # Migrate: add referral_code to existing users without one
    async for user in db.users.find({"referral_code": {"$exists": False}}):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"referral_code": code, "referred_by": None, "profile_photo_url": "", "level_request_pending": False}})

# ===================== AUTH =====================
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
    # Generate unique referral code
    ref_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Check referral
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

# ===================== CREATOR PROFILE =====================
@api.put("/auth/creator-profile")
async def update_creator_profile(user=Depends(get_current_user)):
    # This will be called with form data
    pass

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
            "apple_music": apple_music_url,
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
            "gender": gender,
        }}
    )
    updated = await db.users.find_one({"_id": ObjectId(user["sub"])})
    return serialize_doc(updated)

# ===================== PLATFORM SETTINGS (Admin) =====================
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
    await db.platform_settings.update_one(
        {},
        {"$set": {
            "crypto_wallet_address": crypto_wallet_address,
            "crypto_network": crypto_network,
            "crypto_currency": crypto_currency,
            "bank_name": bank_name,
            "bank_account_holder": bank_account_holder,
            "bank_account_number": bank_account_number,
            "bank_details": bank_details,
            "instructions": instructions,
            "updated_at": now_iso(),
        }},
        upsert=True
    )
    return {"message": "Configuración actualizada"}

# ===================== DEPOSITS =====================
@api.post("/deposits")
async def create_deposit(
    amount: float = Form(...),
    method: str = Form(...),  # crypto or bank
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
        "admin_note": "",
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
        "created_at": now_iso(),
    })
    return {"message": "Depósito aprobado", "amount": dep["amount"]}

@api.put("/admin/deposits/{deposit_id}/reject")
async def reject_deposit(deposit_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.deposits.update_one(
        {"_id": ObjectId(deposit_id), "status": "pending"},
        {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso(), "admin_note": note}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Depósito no encontrado o ya procesado")
    return {"message": "Depósito rechazado"}

# ===================== CAMPAIGNS =====================
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

@api.post("/campaigns")
async def create_campaign(req: CampaignCreate, user=Depends(require_advertiser)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if u["balance"] < req.budget:
        raise HTTPException(400, f"Saldo insuficiente. Tienes ${u['balance']}, necesitas ${req.budget}")
    
    # Check if region has creators
    region_warning = ""
    if req.region:
        region_count = await db.users.count_documents({"role": "creator", "creator_profile.region": req.region})
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
        "audio_url": "",
        "photo_url": "",
        "region_warning": region_warning,
        "status": "active",
        "created_at": now_iso(),
    }
    
    # Reserve budget
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$inc": {"balance": -req.budget}})
    await db.transactions.insert_one({
        "user_id": user["sub"], "type": "campaign_escrow", "amount": -req.budget,
        "reference_id": "", "description": f"Reserva para campaña: {req.title}", "created_at": now_iso(),
    })
    
    result = await db.campaigns.insert_one(campaign)
    # Update reference
    await db.transactions.update_one(
        {"user_id": user["sub"], "type": "campaign_escrow", "reference_id": ""},
        {"$set": {"reference_id": str(result.inserted_id)}}
    )
    campaign["_id"] = result.inserted_id
    return serialize_doc(campaign)

@api.get("/campaigns")
async def list_campaigns(
    status: str = Query(None),
    user=Depends(get_current_user)
):
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
    # Filter by creator profile if available
    if u.get("creator_profile"):
        cp = u["creator_profile"]
        # Optional filtering by region/niche/level - show all active for now
    campaigns = await db.campaigns.find(query).sort("created_at", -1).to_list(500)
    
    # Exclude campaigns already applied to
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

@api.post("/campaigns/{campaign_id}/media")
async def upload_campaign_media(
    campaign_id: str,
    audio: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None),
    user=Depends(require_advertiser)
):
    c = await db.campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not c or (c["advertiser_id"] != user["sub"] and user["role"] != "admin"):
        raise HTTPException(403, "No autorizado")
    update = {}
    if audio:
        update["audio_url"] = await save_upload(audio)
    if photo:
        update["photo_url"] = await save_upload(photo)
    if update:
        await db.campaigns.update_one({"_id": ObjectId(campaign_id)}, {"$set": update})
    return {"message": "Media subida", **update}

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
    await db.campaigns.update_one({"_id": ObjectId(campaign_id)}, {"$set": {"status": "cancelled"}})
    if refund > 0:
        await db.users.update_one({"_id": ObjectId(c["advertiser_id"])}, {"$inc": {"balance": refund}})
        await db.transactions.insert_one({
            "user_id": c["advertiser_id"], "type": "campaign_refund", "amount": refund,
            "reference_id": campaign_id, "description": f"Reembolso por cancelación: {c['title']}", "created_at": now_iso(),
        })
    return {"message": "Campaña cancelada", "refund": refund}

# ===================== APPLICATIONS =====================
@api.post("/applications")
async def create_application(
    campaign_id: str = Form(...),
    message: str = Form(""),
    user=Depends(require_creator)
):
    # Check not already applied
    existing = await db.applications.find_one({"campaign_id": campaign_id, "creator_id": user["sub"], "status": {"$in": ["pending", "accepted"]}})
    if existing:
        raise HTTPException(400, "Ya tienes una aplicación activa para esta campaña")
    
    # Check 24h cooldown after expired/rejected application
    recent_expired = await db.applications.find_one({
        "campaign_id": campaign_id, "creator_id": user["sub"],
        "status": {"$in": ["expired", "rejected"]},
        "updated_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    if recent_expired:
        raise HTTPException(400, "Debes esperar 24 horas antes de volver a aplicar a esta campaña")
    
    c = await db.campaigns.find_one({"_id": ObjectId(campaign_id), "status": "active"})
    if not c:
        raise HTTPException(404, "Campaña no encontrada o inactiva")
    
    # Check max videos per creator
    max_per = c.get("max_videos_per_creator", 1)
    creator_deliverables = await db.deliverables.count_documents({
        "campaign_id": campaign_id, "creator_id": user["sub"], "status": "approved"
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
        "deadline": None,
    }
    result = await db.applications.insert_one(app_doc)
    app_doc["_id"] = result.inserted_id
    return serialize_doc(app_doc)

@api.get("/applications")
async def list_applications(
    campaign_id: str = Query(None),
    user=Depends(get_current_user)
):
    query = {}
    if user["role"] == "creator":
        query["creator_id"] = user["sub"]
    elif user["role"] == "advertiser":
        # Get advertiser's campaigns
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
    # Verify advertiser owns campaign or is admin
    if user["role"] == "advertiser":
        c = await db.campaigns.find_one({"_id": ObjectId(a["campaign_id"])})
        if not c or c["advertiser_id"] != user["sub"]:
            raise HTTPException(403, "No autorizado")
    elif user["role"] != "admin":
        raise HTTPException(403, "No autorizado")
    
    deadline = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    await db.applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"status": "accepted", "accepted_at": now_iso(), "deadline": deadline, "updated_at": now_iso()}}
    )
    return {"message": "Aplicación aceptada", "deadline": deadline}

@api.put("/applications/{app_id}/reject")
async def reject_application(app_id: str, user=Depends(get_current_user)):
    a = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not a:
        raise HTTPException(404, "Aplicación no encontrada")
    await db.applications.update_one({"_id": ObjectId(app_id)}, {"$set": {"status": "rejected"}})
    return {"message": "Aplicación rechazada"}

# ===================== DELIVERABLES =====================
@api.post("/deliverables")
async def submit_deliverable(
    application_id: str = Form(...),
    video_url: str = Form(""),
    notes: str = Form(""),
    platform_links: str = Form(""),  # JSON string of {platform: url}
    platforms_count: int = Form(1),
    screenshot: Optional[UploadFile] = File(None),
    user=Depends(require_creator)
):
    a = await db.applications.find_one({"_id": ObjectId(application_id), "creator_id": user["sub"], "status": "accepted"})
    if not a:
        raise HTTPException(404, "Aplicación no encontrada o no aceptada")
    
    # Check 24h deadline
    if a.get("deadline"):
        deadline_dt = datetime.fromisoformat(a["deadline"])
        if datetime.now(timezone.utc) > deadline_dt:
            await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": {"status": "expired", "updated_at": now_iso()}})
            raise HTTPException(400, "Se venció el plazo de 24 horas para subir el entregable")
    
    # Check no duplicate
    existing_del = await db.deliverables.find_one({"application_id": application_id, "creator_id": user["sub"], "status": {"$ne": "rejected"}})
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
        "permanence_end": None,
    }
    result = await db.deliverables.insert_one(deliverable)
    deliverable["_id"] = result.inserted_id
    return serialize_doc(deliverable)

@api.get("/deliverables")
async def list_deliverables(
    campaign_id: str = Query(None),
    user=Depends(get_current_user)
):
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
    
    # 40% initial release, 60% held for permanence completion
    initial_payout = round(creator_total * 0.40, 2)
    held_payout = round(creator_total * 0.60, 2)
    
    # Calculate permanence end date
    duration_map = {"1_week": 7, "1_month": 30, "6_months": 180}
    days = duration_map.get(c.get("content_duration", "1_month"), 30)
    perm_start = now_iso()
    perm_end = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    # Update deliverable
    await db.deliverables.update_one(
        {"_id": ObjectId(del_id), "status": "pending"},
        {"$set": {
            "status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso(),
            "payout": creator_total, "commission": commission,
            "initial_payment_released": True, "initial_payout": initial_payout,
            "held_payout": held_payout, "final_payment_released": False,
            "bonus_claimed": False,
            "permanence_start": perm_start, "permanence_end": perm_end,
        }}
    )
    # Pay creator initial 40%
    await db.users.update_one({"_id": ObjectId(d["creator_id"])}, {"$inc": {"balance": initial_payout}})
    # Update campaign
    await db.campaigns.update_one(
        {"_id": ObjectId(d["campaign_id"])},
        {"$inc": {"budget_remaining": -payment, "videos_completed": 1}}
    )
    
    # Platform commission transaction
    await db.transactions.insert_one({
        "user_id": d["creator_id"], "type": "campaign_payment_initial", "amount": initial_payout,
        "reference_id": del_id, "description": f"Pago inicial 40% por campaña (comisión {int(commission_rate*100)}%)", "created_at": now_iso(),
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", "type": "platform_commission", "amount": commission,
        "reference_id": del_id, "description": f"Comisión {int(commission_rate*100)}% del creador {d.get('creator_name','')}", "created_at": now_iso(),
    })
    
    # Referral commission (5% of platform commission)
    if creator and creator.get("referred_by"):
        referral_bonus = round(commission * 0.05, 4)
        if referral_bonus > 0:
            await db.users.update_one({"_id": ObjectId(creator["referred_by"])}, {"$inc": {"balance": referral_bonus}})
            await db.transactions.insert_one({
                "user_id": creator["referred_by"], "type": "referral_commission", "amount": referral_bonus,
                "reference_id": del_id, "description": f"Comisión de referido (5%): {d.get('creator_name','')}", "created_at": now_iso(),
            })
    
    # Check if campaign is complete or budget exhausted
    updated_c = await db.campaigns.find_one({"_id": ObjectId(d["campaign_id"])})
    if updated_c["videos_completed"] >= updated_c["videos_requested"] or updated_c["budget_remaining"] <= 0:
        await db.campaigns.update_one({"_id": ObjectId(d["campaign_id"])}, {"$set": {"status": "completed"}})
    
    return {"message": "Entregable aprobado (40% liberado)", "initial_payout": initial_payout, "held_payout": held_payout, "permanence_end": perm_end}

@api.put("/admin/deliverables/{del_id}/reject")
async def reject_deliverable(del_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.deliverables.update_one(
        {"_id": ObjectId(del_id), "status": "pending"},
        {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso(), "admin_note": note}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Entregable no encontrado o ya procesado")
    return {"message": "Entregable rechazado"}

# ===================== KYC =====================
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
        "admin_note": "",
    }
    # Remove old pending KYC
    await db.kyc.delete_many({"user_id": user["sub"], "status": "pending"})
    result = await db.kyc.insert_one(kyc)
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$set": {"kyc_status": "pending"}})
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
    await db.kyc.update_one({"_id": ObjectId(kyc_id)}, {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}})
    await db.users.update_one({"_id": ObjectId(k["user_id"])}, {"$set": {"kyc_status": "verified"}})
    return {"message": "KYC aprobado"}

@api.put("/admin/kyc/{kyc_id}/reject")
async def reject_kyc(kyc_id: str, note: str = "", user=Depends(require_admin)):
    k = await db.kyc.find_one({"_id": ObjectId(kyc_id), "status": "pending"})
    if not k:
        raise HTTPException(404, "KYC no encontrado o ya procesado")
    await db.kyc.update_one({"_id": ObjectId(kyc_id)}, {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso(), "admin_note": note}})
    await db.users.update_one({"_id": ObjectId(k["user_id"])}, {"$set": {"kyc_status": "rejected"}})
    return {"message": "KYC rechazado"}

# ===================== WITHDRAWALS =====================
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
    
    # Check withdrawal frequency
    from datetime import timedelta
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent = await db.withdrawals.count_documents({
        "user_id": user["sub"],
        "created_at": {"$gte": month_ago},
        "status": {"$in": ["pending", "approved"]}
    })
    max_withdrawals = 3 if u.get("is_top10") else 1
    if recent >= max_withdrawals:
        raise HTTPException(400, f"Límite de retiros alcanzado ({max_withdrawals}/mes)")
    
    # Deduct balance immediately
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$inc": {"balance": -req.amount}})
    
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
        "reviewed_at": None,
    }
    result = await db.withdrawals.insert_one(withdrawal)
    await db.transactions.insert_one({
        "user_id": user["sub"], "type": "withdrawal_request", "amount": -req.amount,
        "reference_id": str(result.inserted_id), "description": f"Solicitud de retiro - {req.method}", "created_at": now_iso(),
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
    await db.withdrawals.update_one({"_id": ObjectId(wd_id)}, {"$set": {"status": "approved", "reviewed_by": user["sub"], "reviewed_at": now_iso()}})
    return {"message": "Retiro aprobado"}

@api.put("/admin/withdrawals/{wd_id}/reject")
async def reject_withdrawal(wd_id: str, user=Depends(require_admin)):
    w = await db.withdrawals.find_one({"_id": ObjectId(wd_id), "status": "pending"})
    if not w:
        raise HTTPException(404, "Retiro no encontrado o ya procesado")
    # Refund balance
    await db.users.update_one({"_id": ObjectId(w["user_id"])}, {"$inc": {"balance": w["amount"]}})
    await db.withdrawals.update_one({"_id": ObjectId(wd_id)}, {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso()}})
    await db.transactions.insert_one({
        "user_id": w["user_id"], "type": "withdrawal_refund", "amount": w["amount"],
        "reference_id": wd_id, "description": "Retiro rechazado - saldo devuelto", "created_at": now_iso(),
    })
    return {"message": "Retiro rechazado, saldo devuelto"}

# ===================== TRANSACTIONS =====================
@api.get("/transactions")
async def list_transactions(user=Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"user_id": user["sub"]}
    txns = await db.transactions.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(t) for t in txns]

# ===================== SUBSCRIPTIONS =====================
class SubPlanReq(BaseModel):
    price: float
    description: str = ""

@api.post("/subscriptions/plan")
async def set_subscription_plan(req: SubPlanReq, user=Depends(require_creator)):
    await db.users.update_one(
        {"_id": ObjectId(user["sub"])},
        {"$set": {"subscription_plan": {"price": req.price, "description": req.description, "active": True}}}
    )
    return {"message": "Plan de suscripción actualizado"}

@api.post("/subscriptions/subscribe")
async def subscribe_to_creator(
    creator_id: str = Form(...),
    user=Depends(get_current_user)
):
    creator = await db.users.find_one({"_id": ObjectId(creator_id)})
    if not creator or not creator.get("subscription_plan", {}).get("active"):
        raise HTTPException(404, "Creador sin plan de suscripción activo")
    
    price = creator["subscription_plan"]["price"]
    fan = await db.users.find_one({"_id": ObjectId(user["sub"])})
    if fan["balance"] < price:
        raise HTTPException(400, f"Saldo insuficiente. Necesitas ${price}")
    
    # Check existing
    existing = await db.subscriptions.find_one({"fan_id": user["sub"], "creator_id": creator_id, "active": True})
    if existing:
        raise HTTPException(400, "Ya estás suscrito a este creador")
    
    # Charge fan
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$inc": {"balance": -price}})
    
    # Pay creator (with commission)
    is_top10 = creator.get("is_top10", False)
    rate = 0.35 if is_top10 else 0.25
    commission = round(price * rate, 2)
    payout = round(price - commission, 2)
    await db.users.update_one({"_id": ObjectId(creator_id)}, {"$inc": {"balance": payout}})
    
    sub = {
        "fan_id": user["sub"],
        "creator_id": creator_id,
        "price": price,
        "active": True,
        "created_at": now_iso(),
    }
    await db.subscriptions.insert_one(sub)
    
    await db.transactions.insert_one({
        "user_id": user["sub"], "type": "subscription_payment", "amount": -price,
        "reference_id": creator_id, "description": f"Suscripción a {creator.get('name','')}", "created_at": now_iso(),
    })
    await db.transactions.insert_one({
        "user_id": creator_id, "type": "subscription_income", "amount": payout,
        "reference_id": user["sub"], "description": f"Ingreso por suscripción (comisión {int(rate*100)}%)", "created_at": now_iso(),
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", "type": "platform_commission", "amount": commission,
        "reference_id": creator_id, "description": f"Comisión suscripción {int(rate*100)}%", "created_at": now_iso(),
    })
    return {"message": "Suscripción exitosa"}

@api.get("/subscriptions")
async def list_subscriptions(user=Depends(get_current_user)):
    if user["role"] == "creator":
        subs = await db.subscriptions.find({"creator_id": user["sub"], "active": True}).to_list(500)
    else:
        subs = await db.subscriptions.find({"fan_id": user["sub"], "active": True}).to_list(500)
    result = []
    for s in subs:
        s_ser = serialize_doc(s)
        # Fetch related user info
        if user["role"] == "creator":
            fan = await db.users.find_one({"_id": ObjectId(s["fan_id"])})
            s_ser["fan_name"] = fan.get("name", "") if fan else ""
        else:
            creator = await db.users.find_one({"_id": ObjectId(s["creator_id"])})
            s_ser["creator_name"] = creator.get("name", "") if creator else ""
        result.append(s_ser)
    return result

# ===================== PREMIUM CONTENT =====================
@api.post("/premium-content")
async def create_premium_content(
    content_type: str = Form("post"),  # post, photo, video
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
        "created_at": now_iso(),
    }
    result = await db.premium_content.insert_one(content)
    content["_id"] = result.inserted_id
    return serialize_doc(content)

@api.get("/premium-content/{creator_id}")
async def get_premium_content(creator_id: str, user=Depends(get_current_user)):
    # Check if subscribed or is the creator themselves or admin
    if user["sub"] != creator_id and user["role"] != "admin":
        sub = await db.subscriptions.find_one({"fan_id": user["sub"], "creator_id": creator_id, "active": True})
        if not sub:
            raise HTTPException(403, "Necesitas una suscripción para ver este contenido")
    
    content = await db.premium_content.find({"creator_id": creator_id}).sort("created_at", -1).to_list(500)
    return [serialize_doc(c) for c in content]

# ===================== MUSIC FINANCING =====================
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
        "reviewed_at": None,
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
        {"$set": {"status": "approved", "admin_message": message, "amount_approved": final_amount,
                  "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    # Credit creator
    await db.users.update_one({"_id": ObjectId(r["creator_id"])}, {"$inc": {"balance": final_amount}})
    await db.transactions.insert_one({
        "user_id": r["creator_id"], "type": "music_financing", "amount": final_amount,
        "reference_id": req_id, "description": f"Financiamiento musical: {r['title']}", "created_at": now_iso(),
    })
    return {"message": "Financiamiento aprobado", "amount": final_amount}

@api.put("/admin/music-financing/{req_id}/reject")
async def reject_financing(req_id: str, message: str = "", user=Depends(require_admin)):
    result = await db.music_financing.update_one(
        {"_id": ObjectId(req_id), "status": "pending"},
        {"$set": {"status": "rejected", "admin_message": message, "reviewed_by": user["sub"], "reviewed_at": now_iso()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Solicitud no encontrada o ya procesada")
    return {"message": "Financiamiento rechazado"}

# ===================== RANKINGS =====================
@api.get("/rankings")
async def get_rankings():
    rankings = await db.rankings.find({}).sort("category", 1).to_list(200)
    if not rankings:
        # Generate basic rankings from creators
        return await generate_rankings()
    return [serialize_doc(r) for r in rankings]

async def generate_rankings():
    creators = await db.users.find({"role": "creator", "creator_profile": {"$ne": None}}).to_list(500)
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
            "region": cp.get("region", ""),
        }
        for cat in ["most_viewed", "most_followers"]:
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(entry)
    
    result = []
    sort_keys = {"most_viewed": "avg_views", "most_followers": "followers"}
    cat_labels = {"most_viewed": "Los 10 Más Vistos", "most_followers": "Los 10 Con Más Seguidores"}
    
    for cat, entries in categories.items():
        sorted_entries = sorted(entries, key=lambda x: x.get(sort_keys.get(cat, "followers"), 0), reverse=True)[:10]
        result.append({"category": cat, "label": cat_labels.get(cat, cat), "entries": sorted_entries})
    return result

@api.post("/admin/rankings/recalculate")
async def recalculate_rankings(user=Depends(require_admin)):
    await db.rankings.drop()
    rankings = await generate_rankings()
    if rankings:
        for r in rankings:
            await db.rankings.insert_one(r)
    return {"message": "Rankings recalculados", "count": len(rankings)}

# ===================== ADMIN STATS =====================
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
    
    # Deliverables pending final release
    pending_final_release = await db.deliverables.count_documents({"status": "approved", "final_payment_released": False})
    
    # Platform earnings
    platform_txns = await db.transactions.find({"user_id": "__platform__", "type": "platform_commission"}).to_list(10000)
    total_commissions = sum(t["amount"] for t in platform_txns)
    
    # Total deposits approved
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
        "active_campaigns": active_campaigns,
    }

# ===================== ADMIN USERS =====================
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
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    return {"message": f"Rol cambiado a {role}"}

@api.put("/admin/users/{user_id}/top10")
async def admin_toggle_top10(user_id: str, is_top10: bool = Form(...), user=Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_top10": is_top10}})
    return {"message": f"Top 10: {'Sí' if is_top10 else 'No'}"}

# ===================== PUBLIC EXPLORE =====================
@api.get("/explore/creators")
async def explore_creators(
    niche: str = Query(None),
    region: str = Query(None),
):
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

# ===================== PAYMENT INFO (Public for deposit page) =====================
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
        "instructions": s.get("instructions", ""),
    }

# ===================== SPOTIFY CURATORS =====================
CURATOR_RATES = {
    # (songs, listens): payout
    (10, 1000): 9.0,
    (25, 1000): 22.0,
    (10, 500): 4.0,
    (5, 500): 2.0,
    (10, 100): 0.30,
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
        "created_at": now_iso(),
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
    playlist = await db.curator_playlists.find_one({"_id": ObjectId(playlist_id), "user_id": user["sub"]})
    if not playlist:
        raise HTTPException(404, "Playlist no encontrada")
    
    evidence_url = ""
    if evidence:
        evidence_url = await save_upload(evidence)
    
    # Calculate payout based on rates table
    songs = playlist["song_count"]
    payout = 0.0
    # Find closest matching rate
    for (s, l), rate in sorted(CURATOR_RATES.items(), key=lambda x: (-x[0][1], -x[0][0])):
        if songs >= s and listens_count >= l:
            payout = rate
            break
    
    if payout == 0:
        # Minimum: $0.30 per 100 listens for 10 songs
        if songs >= 5 and listens_count >= 100:
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
        "reviewed_by": None,
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
    await db.users.update_one({"_id": ObjectId(r["user_id"])}, {"$inc": {"balance": payout}})
    await db.transactions.insert_one({
        "user_id": r["user_id"], "type": "curator_payment", "amount": payout,
        "reference_id": req_id, "description": f"Pago curador: {r['playlist_name']} ({r['listens_count']} escuchas)", "created_at": now_iso(),
    })
    return {"message": "Solicitud de curador aprobada", "payout": payout}

@api.put("/admin/curator/requests/{req_id}/reject")
async def reject_curator_request(req_id: str, note: str = "", user=Depends(require_admin)):
    result = await db.curator_requests.update_one(
        {"_id": ObjectId(req_id), "status": "pending"},
        {"$set": {"status": "rejected", "reviewed_by": user["sub"], "reviewed_at": now_iso(), "admin_note": note}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Solicitud no encontrada")
    return {"message": "Solicitud rechazada"}

# ===================== MICRO-TASKS (Escuchar Musica) =====================
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
    
    payout = round(0.02 * (songs_listened / 5), 2)  # $0.02 per 5 songs
    
    task = {
        "user_id": user["sub"],
        "user_email": user["email"],
        "songs_listened": songs_listened,
        "comment": comment,
        "evidence_url": evidence_url,
        "calculated_payout": payout,
        "status": "pending",
        "created_at": now_iso(),
        "reviewed_by": None,
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
    await db.users.update_one({"_id": ObjectId(t["user_id"])}, {"$inc": {"balance": payout}})
    await db.transactions.insert_one({
        "user_id": t["user_id"], "type": "micro_task_payment", "amount": payout,
        "reference_id": task_id, "description": f"Micro-tarea: {t['songs_listened']} canciones escuchadas", "created_at": now_iso(),
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


# ===================== DELIVERABLE: RELEASE FINAL PAYMENT (60%) =====================
@api.put("/admin/deliverables/{del_id}/release-final")
async def release_final_payment(del_id: str, user=Depends(require_admin)):
    d = await db.deliverables.find_one({"_id": ObjectId(del_id), "status": "approved", "final_payment_released": False})
    if not d:
        raise HTTPException(404, "Entregable no encontrado o pago ya liberado")
    
    held = d.get("held_payout", 0)
    if held <= 0:
        raise HTTPException(400, "No hay pago pendiente")
    
    await db.users.update_one({"_id": ObjectId(d["creator_id"])}, {"$inc": {"balance": held}})
    await db.deliverables.update_one({"_id": ObjectId(del_id)}, {"$set": {"final_payment_released": True}})
    await db.transactions.insert_one({
        "user_id": d["creator_id"], "type": "campaign_payment_final", "amount": held,
        "reference_id": del_id, "description": f"Pago final 60% - permanencia cumplida", "created_at": now_iso(),
    })
    return {"message": f"Pago final de ${held} liberado"}

# ===================== DELIVERABLE: CLAIM BONUS =====================
@api.put("/deliverables/{del_id}/claim-bonus")
async def claim_bonus(del_id: str, user=Depends(get_current_user)):
    d = await db.deliverables.find_one({"_id": ObjectId(del_id), "status": "approved", "bonus_claimed": False})
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
    
    await db.users.update_one({"_id": ObjectId(d["creator_id"])}, {"$inc": {"balance": bonus_payout}})
    await db.deliverables.update_one({"_id": ObjectId(del_id)}, {"$set": {"bonus_claimed": True}})
    await db.campaigns.update_one({"_id": ObjectId(d["campaign_id"])}, {"$inc": {"budget_remaining": -bonus}})
    await db.transactions.insert_one({
        "user_id": d["creator_id"], "type": "bonus_payment", "amount": bonus_payout,
        "reference_id": del_id, "description": f"Bonus reclamado (comisión {int(commission_rate*100)}%)", "created_at": now_iso(),
    })
    await db.transactions.insert_one({
        "user_id": "__platform__", "type": "platform_commission", "amount": bonus_commission,
        "reference_id": del_id, "description": f"Comisión bonus {int(commission_rate*100)}%", "created_at": now_iso(),
    })
    return {"message": f"Bonus de ${bonus_payout} reclamado"}

# ===================== LEVEL UP REQUEST =====================
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
        "created_at": now_iso(),
    }
    await db.level_requests.insert_one(req_doc)
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$set": {"level_request_pending": True}})
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
    await db.level_requests.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "approved"}})
    await db.users.update_one(
        {"_id": ObjectId(r["user_id"])},
        {"$set": {"level_request_pending": False, "creator_profile.creator_level": r["requested_level"]}}
    )
    return {"message": f"Nivel actualizado a {r['requested_level']}"}

@api.put("/admin/level-requests/{req_id}/reject")
async def reject_level_request(req_id: str, user=Depends(require_admin)):
    r = await db.level_requests.find_one({"_id": ObjectId(req_id), "status": "pending"})
    if not r:
        raise HTTPException(404, "Solicitud no encontrada")
    await db.level_requests.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "rejected"}})
    await db.users.update_one({"_id": ObjectId(r["user_id"])}, {"$set": {"level_request_pending": False}})
    return {"message": "Solicitud rechazada"}

# ===================== PROFILE PHOTO =====================
@api.post("/auth/profile-photo")
async def upload_profile_photo(
    photo: UploadFile = File(...),
    user=Depends(get_current_user)
):
    photo_url = await save_upload(photo)
    await db.users.update_one({"_id": ObjectId(user["sub"])}, {"$set": {"profile_photo_url": photo_url}})
    return {"message": "Foto actualizada", "url": photo_url}

# ===================== REFERRAL INFO =====================
@api.get("/referrals")
async def get_referral_info(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["sub"])})
    referral_code = u.get("referral_code", "")
    # Count referrals
    referrals = await db.users.find({"referred_by": user["sub"]}).to_list(500)
    # Referral earnings
    ref_txns = await db.transactions.find({"user_id": user["sub"], "type": "referral_commission"}).to_list(1000)
    total_ref_earnings = sum(t["amount"] for t in ref_txns)
    return {
        "referral_code": referral_code,
        "referrals_count": len(referrals),
        "referrals": [{"name": r.get("name", ""), "email": r.get("email", ""), "created_at": r.get("created_at", "")} for r in referrals],
        "total_referral_earnings": round(total_ref_earnings, 4),
    }

# ===================== ADMIN: WALLET (Platform Commissions) =====================
@api.get("/admin/wallet")
async def admin_wallet(user=Depends(require_admin)):
    txns = await db.transactions.find({"user_id": "__platform__"}).sort("created_at", -1).to_list(5000)
    total = sum(t["amount"] for t in txns)
    return {"total_commissions": round(total, 2), "transactions": [serialize_doc(t) for t in txns]}

# ===================== ADMIN: CUSTOM RANKING BOARDS =====================
@api.post("/admin/ranking-boards")
async def create_ranking_board(
    name: str = Form(...),
    description: str = Form(""),
    user=Depends(require_admin)
):
    board = {"name": name, "description": description, "entries": [], "created_at": now_iso()}
    result = await db.ranking_boards.insert_one(board)
    return {"message": "Tablero creado", "id": str(result.inserted_id)}

@api.get("/ranking-boards")
async def list_ranking_boards():
    boards = await db.ranking_boards.find({}).sort("created_at", -1).to_list(100)
    return [serialize_doc(b) for b in boards]

@api.put("/admin/ranking-boards/{board_id}/add-creator")
async def add_creator_to_board(board_id: str, creator_id: str = Form(...), user=Depends(require_admin)):
    creator = await db.users.find_one({"_id": ObjectId(creator_id)})
    if not creator:
        raise HTTPException(404, "Creador no encontrado")
    entry = {"user_id": creator_id, "name": creator.get("name", ""), "added_at": now_iso()}
    await db.ranking_boards.update_one({"_id": ObjectId(board_id)}, {"$push": {"entries": entry}})
    return {"message": "Creador agregado al tablero"}

# ===================== ADMIN: SET CREATOR LEVEL =====================
@api.put("/admin/users/{user_id}/level")
async def admin_set_level(user_id: str, level: str = Form(...), user=Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"creator_profile.creator_level": level}}
    )
    return {"message": f"Nivel actualizado a {level}"}

# ===================== STATIC FILES =====================
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include router
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
