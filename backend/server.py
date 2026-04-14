from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
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
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin, require_advertiser, require_creator
)

# ==================== CONFIGURACIÓN INICIAL ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client.get_database()

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def now_iso(): 
    return datetime.now(timezone.utc).isoformat()

def serialize_doc(doc):
    if not doc: 
        return None
    doc['_id'] = str(doc['_id'])
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId): 
            doc[k] = str(v)
    return doc

def generate_unique_id(): 
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

app = FastAPI(title="Family Fans Mony API")

# ==================== MODELS ====================
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "fan"

class UserLogin(BaseModel):
    email: str
    password: str

class CampaignCreate(BaseModel):
    title: str
    description: str
    budget: float
    videos_requested: int
    deadline: str
    requirements: str
    music_url: str = ""
    reference_link: str = ""
    vocaroo_link: str = ""
    max_videos_per_creator: int = 1

class ApplicationCreate(BaseModel):
    campaign_id: str
    message: str

class DeliverableSubmit(BaseModel):
    application_id: str
    video_url: str
    platform: str
    video_link: str

class DepositCreate(BaseModel):
    amount: float
    payment_method: str
    transaction_id: str

class WithdrawalRequest(BaseModel):
    amount: float
    withdrawal_method: str = Field(..., description="crypto o bank")
    crypto_network: Optional[str] = None
    crypto_currency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_details: Optional[str] = None

class KYCSubmit(BaseModel):
    document_type: str
    document_number: str
    document_front: str
    document_back: str
    selfie: str

class ContentCreate(BaseModel):
    content_type: str
    title: str
    url: str

class PremiumPlan(BaseModel):
    price: float
    description: str

class RankingBoardCreate(BaseModel):
    name: str
    criteria: str
    start_date: str
    end_date: str
    prizes: List[dict]

class LevelRequestCreate(BaseModel):
    current_level: int
    requested_level: int
    justification: str

class MusicFinancingCreate(BaseModel):
    artist_name: str
    project_title: str
    funding_goal: float
    description: str
    duration_days: int

class CuratorApplication(BaseModel):
    experience: str
    genres: List[str]
    motivation: str

class MicroTaskCreate(BaseModel):
    title: str
    description: str
    reward: float
    task_type: str

# ==================== UTILS ====================
async def save_upload(file: UploadFile, subdir: str = "") -> str:
    """Guarda archivo y retorna URL relativa"""
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if file.filename else "bin"
    filename = f"{file_id}.{ext}"
    subpath = UPLOAD_DIR / subdir if subdir else UPLOAD_DIR
    subpath.mkdir(parents=True, exist_ok=True)
    filepath = subpath / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(await file.read())
    
    return f"/api/uploads/{subdir}/{filename}" if subdir else f"/api/uploads/{filename}"

# ==================== AUTH ENDPOINTS ====================
@api.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing: 
        raise HTTPException(400, "El correo ya está registrado")
    
    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": now_iso(),
        "wallet_balance": 0.0,
        "is_verified": False,
        "level": 1,
        "xp": 0
    }
    
    result = await db.users.insert_one(user_doc)
    token = create_token(str(result.inserted_id), user.role)
    user_doc['_id'] = str(result.inserted_id)
    user_doc.pop('password')
    return {"message": "Usuario registrado", "user": user_doc, "token": token}

@api.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(401, "Credenciales inválidas")
    
    token = create_token(str(user['_id']), user['role'])
    user['_id'] = str(user['_id'])
    user.pop('password')
    return {"message": "Login exitoso", "user": user, "token": token}

@api.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user['sub'])})
    if not u: 
        raise HTTPException(404, "Usuario no encontrado")
    u['_id'] = str(u['_id'])
    u.pop('password', None)
    return u

# ==================== ADMIN ENDPOINTS ====================
@api.get("/admin/dashboard")
async def admin_dashboard(user=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_campaigns = await db.campaigns.count_documents({})
    total_applications = await db.applications.count_documents({})
    total_deliverables = await db.deliverables.count_documents({})
    total_deposits = await db.deposits.count_documents({})
    
    users_by_role = {}
    async for doc in db.users.aggregate([{"$group": {"_id": "$role", "count": {"$sum": 1}}}]):
        users_by_role[doc['_id']] = doc['count']
    
    return {
        "total_users": total_users,
        "total_campaigns": total_campaigns,
        "total_applications": total_applications,
        "total_deliverables": total_deliverables,
        "total_deposits": total_deposits,
        "users_by_role": users_by_role
    }

@api.get("/admin/users")
async def get_all_users(skip: int = 0, limit: int = 100, user=Depends(require_admin)):
    users = await db.users.find().skip(skip).limit(limit).to_list(limit)
    return [serialize_doc(u) for u in users]

@api.put("/admin/users/{user_id}/level")
async def update_user_level(user_id: str, level: int, user=Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"level": level, "updated_at": now_iso()}})
    return {"message": f"Nivel actualizado a {level}"}

# ==================== CAMPAIGNS ====================
@api.post("/campaigns")
async def create_campaign(campaign: CampaignCreate, user=Depends(require_advertiser)):
    campaign_id = generate_unique_id()
    
    c = {
        "campaign_id": campaign_id,
        "advertiser_id": user['sub'],
        "title": campaign.title,
        "description": campaign.description,
        "budget": campaign.budget,
        "budget_remaining": campaign.budget,
        "videos_requested": campaign.videos_requested,
        "videos_completed": 0,
        "deadline": campaign.deadline,
        "requirements": campaign.requirements,
        "music_url": campaign.music_url,
        "reference_link": campaign.reference_link,
        "vocaroo_link": campaign.vocaroo_link,
        "max_videos_per_creator": campaign.max_videos_per_creator,
        "status": "active",
        "created_at": now_iso(),
        "applications_count": 0,
        "approved_count": 0
    }
    
    result = await db.campaigns.insert_one(c)
    c['_id'] = str(result.inserted_id)
    return {"message": "Campaña creada", "campaign": c, "campaign_id": campaign_id}

@api.get("/campaigns")
async def get_campaigns(status: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if status: 
        query['status'] = status
    
    campaigns = await db.campaigns.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(c) for c in campaigns]

@api.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user=Depends(get_current_user)):
    c = await db.campaigns.find_one({"campaign_id": campaign_id})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada")
    return serialize_doc(c)

@api.post("/campaigns/apply")
async def apply_campaign(application: ApplicationCreate, user=Depends(require_creator)):
    campaign_id = application.campaign_id
    
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
        "message": application.message,
        "status": "pending",
        "created_at": now_iso(),
        "deadline": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    }
    
    result = await db.applications.insert_one(app_doc)
    await db.campaigns.update_one({"_id": ObjectId(campaign_id)}, {"$inc": {"applications_count": 1}})
    
    app_doc['_id'] = str(result.inserted_id)
    return {"message": "Aplicación enviada", "application": app_doc}

@api.get("/creator/applications")
async def get_my_applications(user=Depends(require_creator)):
    apps = await db.applications.find({"creator_id": user["sub"]}).sort("created_at", -1).to_list(100)
    return [serialize_doc(a) for a in apps]

@api.post("/creator/deliverable/submit")
async def submit_deliverable(deliverable: DeliverableSubmit, user=Depends(require_creator)):
    application_id = deliverable.application_id
    
    a = await db.applications.find_one({"_id": ObjectId(application_id), "creator_id": user["sub"], "status": "accepted"})
    if not a:
        raise HTTPException(404, "Aplicación no encontrada o no aceptada")
    
    if a.get("deadline"):
        deadline_dt = datetime.fromisoformat(a["deadline"])
        if datetime.now(timezone.utc) > deadline_dt:
            await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": {"status": "expired", "updated_at": now_iso()}})
            raise HTTPException(400, "Se venció el plazo de 24 horas para subir el entregable")
    
    existing_del = await db.deliverables.find_one({
        "application_id": application_id,
        "creator_id": user["sub"],
        "status": {"$ne": "rejected"}
    })
    if existing_del: 
        raise HTTPException(400, "Ya enviaste un entregable para esta aplicación")
    
    app_data = await db.applications.find_one({"_id": ObjectId(application_id)})
    campaign_data = await db.campaigns.find_one({"campaign_id": app_data["campaign_id"]})
    
    creator_total = campaign_data.get("budget", 0) / campaign_data.get("videos_requested", 1)
    initial_payout = round(creator_total * 0.40, 2)
    held_payout = round(creator_total * 0.60, 2)
    permanence_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    del_doc = {
        "application_id": application_id,
        "campaign_id": app_data["campaign_id"],
        "campaign_title": app_data.get("campaign_title", ""),
        "creator_id": user["sub"],
        "creator_name": a.get("creator_name", ""),
        "video_url": deliverable.video_url,
        "platform": deliverable.platform,
        "video_link": deliverable.video_link,
        "status": "pending",
        "initial_payout": initial_payout,
        "held_payout": held_payout,
        "permanence_end": permanence_end,
        "created_at": now_iso()
    }
    
    result = await db.deliverables.insert_one(del_doc)
    await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": {"status": "submitted", "updated_at": now_iso()}})
    
    del_doc['_id'] = str(result.inserted_id)
    return {"message": "Entregable enviado", "deliverable": del_doc}

@api.get("/admin/deliverables")
async def get_all_deliverables(status: Optional[str] = None, campaign_id: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    if campaign_id: 
        query['campaign_id'] = campaign_id
    
    deliverables = await db.deliverables.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(d) for d in deliverables]

@api.put("/admin/deliverables/{del_id}/approve")
async def approve_deliverable(del_id: str, user=Depends(require_admin)):
    d = await db.deliverables.find_one({"_id": ObjectId(del_id)})
    if not d: 
        raise HTTPException(404, "Entregable no encontrado")
    if d['status'] != 'pending': 
        raise HTTPException(400, f"El entregable ya está {d['status']}")
    
    await db.users.update_one({"_id": ObjectId(d['creator_id'])}, {"$inc": {"wallet_balance": d['initial_payout']}})
    
    await db.deliverables.update_one({"_id": ObjectId(del_id)}, {
        "$set": {
            "status": "approved",
            "approved_at": now_iso(),
            "approved_by": user['sub'],
            "initial_payout_released": True
        }
    })
    
    await db.campaigns.update_one({"campaign_id": d['campaign_id']}, {
        "$inc": {"videos_completed": 1, "budget_remaining": -d['initial_payout']}
    })
    
    updated_c = await db.campaigns.find_one({"campaign_id": d['campaign_id']})
    if updated_c["videos_completed"] >= updated_c["videos_requested"] or updated_c["budget_remaining"] <= 0:
        await db.campaigns.update_one({"campaign_id": d["campaign_id"]}, {"$set": {"status": "completed"}})
    
    return {"message": "Entregable aprobado (40% liberado)", "initial_payout": d['initial_payout'], "held_payout": d['held_payout'], "permanence_end": d['permanence_end']}

@api.put("/admin/deliverables/{del_id}/reject")
async def reject_deliverable(del_id: str, note: str = "", user=Depends(require_admin)):
    await db.deliverables.update_one({"_id": ObjectId(del_id)}, {
        "$set": {"status": "rejected", "rejection_note": note, "rejected_at": now_iso(), "rejected_by": user['sub']}
    })
    d = await db.deliverables.find_one({"_id": ObjectId(del_id)})
    await db.applications.update_one({"_id": ObjectId(d['application_id'])}, {"$set": {"status": "rejected", "updated_at": now_iso()}})
    return {"message": "Entregable rechazado"}

@api.get("/admin/campaigns")
async def admin_get_campaigns(user=Depends(require_admin)):
    campaigns = await db.campaigns.find().sort("created_at", -1).to_list(200)
    return [serialize_doc(c) for c in campaigns]

@api.get("/admin/applications")
async def admin_get_applications(status: Optional[str] = None, campaign_id: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    if campaign_id: 
        query['campaign_id'] = campaign_id
    
    applications = await db.applications.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(a) for a in applications]

@api.put("/admin/applications/{app_id}/accept")
async def accept_application(app_id: str, user=Depends(require_admin)):
    await db.applications.update_one({"_id": ObjectId(app_id)}, {"$set": {"status": "accepted", "updated_at": now_iso()}})
    return {"message": "Aplicación aceptada"}

@api.put("/admin/campaigns/{camp_id}/toggle")
async def toggle_campaign_status(camp_id: str, user=Depends(require_admin)):
    c = await db.campaigns.find_one({"_id": ObjectId(camp_id)})
    if not c: 
        raise HTTPException(404, "Campaña no encontrada")
    
    new_status = "paused" if c['status'] == 'active' else "active"
    await db.campaigns.update_one({"_id": ObjectId(camp_id)}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    return {"message": f"Campaña {new_status}", "new_status": new_status}

# ==================== DEPOSITS & WITHDRAWALS ====================
@api.post("/deposits")
async def create_deposit(deposit: DepositCreate, user=Depends(get_current_user)):
    dep = {
        "user_id": user['sub'],
        "amount": deposit.amount,
        "payment_method": deposit.payment_method,
        "transaction_id": deposit.transaction_id,
        "status": "pending",
        "created_at": now_iso()
    }
    result = await db.deposits.insert_one(dep)
    dep['_id'] = str(result.inserted_id)
    return {"message": "Depósito creado", "deposit": dep}

@api.get("/deposits/my")
async def get_my_deposits(user=Depends(get_current_user)):
    deposits = await db.deposits.find({"user_id": user['sub']}).sort("created_at", -1).to_list(100)
    return [serialize_doc(d) for d in deposits]

@api.post("/withdrawals")
async def request_withdrawal(withdrawal: WithdrawalRequest, user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user['sub'])})
    if u['wallet_balance'] < withdrawal.amount:
        raise HTTPException(400, "Saldo insuficiente")
    
    if withdrawal.amount < 10:
        raise HTTPException(400, "El monto mínimo de retiro es $10")
    
    with_doc = {
        "user_id": user['sub'],
        "user_name": u.get('name', ''),
        "user_email": u.get('email', ''),
        "amount": withdrawal.amount,
        "withdrawal_method": withdrawal.withdrawal_method,
        "crypto_network": withdrawal.crypto_network,
        "crypto_currency": withdrawal.crypto_currency,
        "bank_name": withdrawal.bank_name,
        "bank_account_holder": withdrawal.bank_account_holder,
        "bank_account_number": withdrawal.bank_account_number,
        "bank_details": withdrawal.bank_details,
        "status": "pending",
        "created_at": now_iso()
    }
    
    result = await db.withdrawals.insert_one(with_doc)
    with_doc['_id'] = str(result.inserted_id)
    return {"message": "Solicitud de retiro enviada", "withdrawal": with_doc}

@api.get("/withdrawals/my")
async def get_my_withdrawals(user=Depends(get_current_user)):
    withdrawals = await db.withdrawals.find({"user_id": user['sub']}).sort("created_at", -1).to_list(100)
    return [serialize_doc(w) for w in withdrawals]

@api.get("/admin/deposits")
async def admin_get_deposits(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    deposits = await db.deposits.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(d) for d in deposits]

@api.get("/admin/withdrawals")
async def admin_get_withdrawals(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    withdrawals = await db.withdrawals.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(w) for w in withdrawals]

@api.put("/admin/deposits/{dep_id}/approve")
async def approve_deposit(dep_id: str, user=Depends(require_admin)):
    dep = await db.deposits.find_one({"_id": ObjectId(dep_id)})
    if not dep: 
        raise HTTPException(404, "Depósito no encontrado")
    
    await db.users.update_one({"_id": ObjectId(dep['user_id'])}, {"$inc": {"wallet_balance": dep['amount']}})
    await db.deposits.update_one({"_id": ObjectId(dep_id)}, {"$set": {"status": "approved", "approved_at": now_iso(), "approved_by": user['sub']}})
    return {"message": "Depósito aprobado"}

@api.put("/admin/withdrawals/{with_id}/approve")
async def approve_withdrawal(with_id: str, user=Depends(require_admin)):
    w = await db.withdrawals.find_one({"_id": ObjectId(with_id)})
    if not w: 
        raise HTTPException(404, "Retiro no encontrado")
    
    u = await db.users.find_one({"_id": ObjectId(w['user_id'])})
    if u['wallet_balance'] < w['amount']:
        raise HTTPException(400, "El usuario no tiene saldo suficiente")
    
    await db.users.update_one({"_id": ObjectId(w['user_id'])}, {"$inc": {"wallet_balance": -w['amount']}})
    await db.withdrawals.update_one({"_id": ObjectId(with_id)}, {"$set": {"status": "approved", "approved_at": now_iso(), "approved_by": user['sub']}})
    return {"message": "Retiro aprobado"}

# ==================== KYC ====================
@api.post("/kyc/submit")
async def submit_kyc(kyc: KYCSubmit, user=Depends(get_current_user)):
    kyc_doc = {
        "user_id": user['sub'],
        "document_type": kyc.document_type,
        "document_number": kyc.document_number,
        "document_front": kyc.document_front,
        "document_back": kyc.document_back,
        "selfie": kyc.selfie,
        "status": "pending",
        "created_at": now_iso()
    }
    
    existing = await db.kyc_applications.find_one({"user_id": user['sub'], "status": "pending"})
    if existing: 
        raise HTTPException(400, "Ya tienes una solicitud KYC pendiente")
    
    result = await db.kyc_applications.insert_one(kyc_doc)
    kyc_doc['_id'] = str(result.inserted_id)
    return {"message": "KYC enviado", "kyc": kyc_doc}

@api.get("/kyc/my")
async def get_my_kyc(user=Depends(get_current_user)):
    kyc = await db.kyc_applications.find({"user_id": user['sub']}).sort("created_at", -1).to_list(10)
    return [serialize_doc(k) for k in kyc]

@api.get("/admin/kyc")
async def admin_get_kyc(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    kyc_list = await db.kyc_applications.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(k) for k in kyc_list]

@api.put("/admin/kyc/{kyc_id}/approve")
async def approve_kyc(kyc_id: str, user=Depends(require_admin)):
    await db.kyc_applications.update_one({"_id": ObjectId(kyc_id)}, {"$set": {"status": "approved", "approved_at": now_iso()}})
    kyc = await db.kyc_applications.find_one({"_id": ObjectId(kyc_id)})
    await db.users.update_one({"_id": ObjectId(kyc['user_id'])}, {"$set": {"is_verified": True, "verified_at": now_iso()}})
    return {"message": "KYC aprobado"}

# ==================== CONTENT & PREMIUM ====================
@api.post("/creator/content")
async def add_content(content: ContentCreate, user=Depends(require_creator)):
    c = {
        "creator_id": user['sub'],
        "content_type": content.content_type,
        "title": content.title,
        "url": content.url,
        "created_at": now_iso()
    }
    result = await db.creator_content.insert_one(c)
    c['_id'] = str(result.inserted_id)
    return {"message": "Contenido agregado", "content": c}

@api.get("/creator/my-content")
async def get_my_content(user=Depends(require_creator)):
    content = await db.creator_content.find({"creator_id": user['sub']}).sort("created_at", -1).to_list(100)
    return [serialize_doc(c) for c in content]

@api.post("/creator/premium/plan")
async def set_premium_plan(plan: PremiumPlan, user=Depends(require_creator)):
    await db.premium_plans.update_one(
        {"creator_id": user['sub']},
        {"$set": {"price": plan.price, "description": plan.description, "updated_at": now_iso()}},
        upsert=True
    )
    return {"message": "Plan premium actualizado"}

@api.get("/creator/premium/subscribers")
async def get_premium_subscribers(user=Depends(require_creator)):
    subs = await db.subscriptions.find({"creator_id": user['sub'], "active": True}).to_list(200)
    return [serialize_doc(s) for s in subs]

# ==================== RANKINGS ====================
@api.post("/admin/rankings")
async def create_ranking_board(ranking: RankingBoardCreate, user=Depends(require_admin)):
    r = {
        "name": ranking.name,
        "criteria": ranking.criteria,
        "start_date": ranking.start_date,
        "end_date": ranking.end_date,
        "prizes": ranking.prizes,
        "status": "active",
        "created_at": now_iso(),
        "created_by": user['sub']
    }
    result = await db.ranking_boards.insert_one(r)
    r['_id'] = str(result.inserted_id)
    return {"message": "Ranking creado", "ranking": r}

@api.get("/rankings")
async def get_active_rankings(user=Depends(get_current_user)):
    rankings = await db.ranking_boards.find({"status": "active"}).sort("created_at", -1).to_list(50)
    return [serialize_doc(r) for r in rankings]

# ==================== LEVEL REQUESTS ====================
@api.post("/creator/level/request")
async def request_level_change(request: LevelRequestCreate, user=Depends(require_creator)):
    r = {
        "creator_id": user['sub'],
        "current_level": request.current_level,
        "requested_level": request.requested_level,
        "justification": request.justification,
        "status": "pending",
        "created_at": now_iso()
    }
    result = await db.level_requests.insert_one(r)
    r['_id'] = str(result.inserted_id)
    return {"message": "Solicitud de nivel enviada", "request": r}

@api.get("/admin/level-requests")
async def get_level_requests(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status: 
        query['status'] = status
    requests = await db.level_requests.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(r) for r in requests]

@api.put("/admin/level-requests/{req_id}/approve")
async def approve_level_request(req_id: str, user=Depends(require_admin)):
    req = await db.level_requests.find_one({"_id": ObjectId(req_id)})
    if not req: 
        raise HTTPException(404, "Solicitud no encontrada")
    
    await db.level_requests.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "approved", "approved_at": now_iso()}})
    await db.users.update_one({"_id": ObjectId(req['creator_id'])}, {"$set": {"level": req['requested_level']}})
    return {"message": f"Nivel actualizado a {req['requested_level']}"}

# ==================== MUSIC FINANCING ====================
@api.post("/music-financing")
async def create_music_financing(financing: MusicFinancingCreate, user=Depends(get_current_user)):
    f = {
        "artist_id": user['sub'],
        "artist_name": financing.artist_name,
        "project_title": financing.project_title,
        "funding_goal": financing.funding_goal,
        "funding_current": 0,
        "description": financing.description,
        "duration_days": financing.duration_days,
        "end_date": (datetime.now(timezone.utc) + timedelta(days=financing.duration_days)).isoformat(),
        "status": "active",
        "created_at": now_iso()
    }
    result = await db.music_financing.insert_one(f)
    f['_id'] = str(result.inserted_id)
    return {"message": "Proyecto de financiamiento creado", "financing": f}

@api.get("/music-financing")
async def get_music_financing_projects(status: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if status: 
        query['status'] = status
    projects = await db.music_financing.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(p) for p in projects]

# ==================== CURATOR ====================
@api.post("/curator/apply")
async def apply_curator(application: CuratorApplication, user=Depends(get_current_user)):
    app_doc = {
        "user_id": user['sub'],
        "experience": application.experience,
        "genres": application.genres,
        "motivation": application.motivation,
        "status": "pending",
        "created_at": now_iso()
    }
    result = await db.curator_applications.insert_one(app_doc)
    app_doc['_id'] = str(result.inserted_id)
    return {"message": "Solicitud de curador enviada", "application": app_doc}

# ==================== MICRO TASKS ====================
@api.post("/micro-tasks")
async def create_micro_task(task: MicroTaskCreate, user=Depends(require_advertiser)):
    t = {
        "advertiser_id": user['sub'],
        "title": task.title,
        "description": task.description,
        "reward": task.reward,
        "task_type": task.task_type,
        "status": "active",
        "created_at": now_iso()
    }
    result = await db.micro_tasks.insert_one(t)
    t['_id'] = str(result.inserted_id)
    return {"message": "Micro tarea creada", "task": t}

@api.get("/micro-tasks")
async def get_micro_tasks(user=Depends(get_current_user)):
    tasks = await db.micro_tasks.find({"status": "active"}).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in tasks]

# ==================== SETTINGS ====================
@api.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    settings = await db.settings.find_one({})
    if not settings:
        settings = {
            "min_withdrawal": 10,
            "platform_fee_percent": 10,
            "auto_approve_deposits": False,
            "maintenance_mode": False
        }
    return settings

@api.put("/admin/settings")
async def update_settings(settings_data: dict, user=Depends(require_admin)):
    await db.settings.update_one({}, {"$set": {**settings_data, "updated_at": now_iso()}}, upsert=True)
    return {"message": "Configuración actualizada"}

# ==================== WALLET ====================
@api.get("/wallet/balance")
async def get_wallet_balance(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user['sub'])})
    return {"balance": u.get('wallet_balance', 0), "user_id": user['sub']}

@api.get("/wallet/transactions")
async def get_wallet_transactions(user=Depends(get_current_user)):
    deposits = await db.deposits.find({"user_id": user['sub']}).to_list(50)
    withdrawals = await db.withdrawals.find({"user_id": user['sub']}).to_list(50)
    
    transactions = []
    for d in deposits:
        transactions.append({
            "type": "deposit",
            "amount": d['amount'],
            "status": d['status'],
            "date": d['created_at'],
            "id": str(d['_id'])
        })
    for w in withdrawals:
        transactions.append({
            "type": "withdrawal",
            "amount": -w['amount'],
            "status": w['status'],
            "date": w['created_at'],
            "id": str(w['_id'])
        })
    
    transactions.sort(key=lambda x: x['date'], reverse=True)
    return transactions

# ==================== API ROUTER SETUP ====================
api = APIRouter(prefix="/api")

# Attach all endpoints to the router
api.post("/auth/register")(register)
api.post("/auth/login")(login)
api.get("/auth/me")(get_me)
api.get("/admin/dashboard")(admin_dashboard)
api.get("/admin/users")(get_all_users)
api.put("/admin/users/{user_id}/level")(update_user_level)
api.post("/campaigns")(create_campaign)
api.get("/campaigns")(get_campaigns)
api.get("/campaigns/{campaign_id}")(get_campaign)
api.post("/campaigns/apply")(apply_campaign)
api.get("/creator/applications")(get_my_applications)
api.post("/creator/deliverable/submit")(submit_deliverable)
api.get("/admin/deliverables")(get_all_deliverables)
api.put("/admin/deliverables/{del_id}/approve")(approve_deliverable)
api.put("/admin/deliverables/{del_id}/reject")(reject_deliverable)
api.get("/admin/campaigns")(admin_get_campaigns)
api.get("/admin/applications")(admin_get_applications)
api.put("/admin/applications/{app_id}/accept")(accept_application)
api.put("/admin/campaigns/{camp_id}/toggle")(toggle_campaign_status)
api.post("/deposits")(create_deposit)
api.get("/deposits/my")(get_my_deposits)
api.post("/withdrawals")(request_withdrawal)
api.get("/withdrawals/my")(get_my_withdrawals)
api.get("/admin/deposits")(admin_get_deposits)
api.get("/admin/withdrawals")(admin_get_withdrawals)
api.put("/admin/deposits/{dep_id}/approve")(approve_deposit)
api.put("/admin/withdrawals/{with_id}/approve")(approve_withdrawal)
api.post("/kyc/submit")(submit_kyc)
api.get("/kyc/my")(get_my_kyc)
api.get("/admin/kyc")(admin_get_kyc)
api.put("/admin/kyc/{kyc_id}/approve")(approve_kyc)
api.post("/creator/content")(add_content)
api.get("/creator/my-content")(get_my_content)
api.post("/creator/premium/plan")(set_premium_plan)
api.get("/creator/premium/subscribers")(get_premium_subscribers)
api.post("/admin/rankings")(create_ranking_board)
api.get("/rankings")(get_active_rankings)
api.post("/creator/level/request")(request_level_change)
api.get("/admin/level-requests")(get_level_requests)
api.put("/admin/level-requests/{req_id}/approve")(approve_level_request)
api.post("/music-financing")(create_music_financing)
api.get("/music-financing")(get_music_financing_projects)
api.post("/curator/apply")(apply_curator)
api.post("/micro-tasks")(create_micro_task)
api.get("/micro-tasks")(get_micro_tasks)
api.get("/settings")(get_settings)
api.put("/admin/settings")(update_settings)
api.get("/wallet/balance")(get_wallet_balance)
api.get("/wallet/transactions")(get_wallet_transactions)

# ===================== 🔹 NUEVO: CHAT, MEDIA & CLOUDINARY =====================
# Importar y registrar los nuevos routers manteniendo la estructura /api/...
from api.chat import router as chat_router
from api.media import router as media_router
from api.cloudinary import router as cloudinary_router

# Incluir routers en el router principal para mantener consistencia de prefijos
api.include_router(chat_router)
api.include_router(media_router)
api.include_router(cloudinary_router)

# ===================== 🔹 NUEVO: JOB DE LIMPIEZA AUTOMÁTICA =====================
@app.on_event("startup")
async def start_cleanup_job():
    async def cleanup_expired():
        while True:
            try:
                # Importar servicios aquí para evitar errores de importación en startup
                from services.cloudinary_service import CloudinaryService
                from services.storage_quota import StorageQuotaService
                
                # Buscar contenido expirado no eliminado
                expired = await db.media_content.find({
                    "expires_at": {"$lt": datetime.now()},
                    "is_deleted": {"$ne": True}
                }).to_list(100)
                
                quota_service = StorageQuotaService(client, db.name)
                
                for media in expired:
                    try:
                        # Eliminar de Cloudinary
                        CloudinaryService.delete_media(
                            media["cloudinary_public_id"],
                            resource_type="video" if media.get("type") == "video" else "image"
                        )
                    except Exception as e:
                        logger.error(f"Error eliminando de Cloudinary {media['cloudinary_public_id']}: {e}")
                    
                    # Marcar como eliminado en BD
                    await db.media_content.update_one(
                        {"_id": media["_id"]},
                        {"$set": {
                            "is_deleted": True, 
                            "deleted_at": datetime.now().isoformat(),
                            "cleanup_reason": "expiration"
                        }}
                    )
                    
                    # Liberar espacio en la cuota del creador
                    if media.get("size_mb"):
                        await quota_service.update_usage(
                            str(media["creator_id"]),
                            -media["size_mb"],
                            media["_id"],
                            operation="remove"
                        )
                    
                    logger.info(f"✅ Contenido expirado limpiado: {media['_id']}")
                
                # Esperar 24 horas antes de la siguiente limpieza
                await asyncio.sleep(86400)
                
            except Exception as e:
                logger.error(f"❌ Error en cleanup job: {e}")
                # Reintentar en 1 hora si hay fallo
                await asyncio.sleep(3600)
    
    # Iniciar tarea en segundo plano
    asyncio.create_task(cleanup_expired())
    logger.info(" Job de limpieza de contenido expirado iniciado")

# ===================== STATIC FILES & MIDDLEWARE =====================
# Incluir router principal con todos los endpoints
app.include_router(api)

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
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
    
