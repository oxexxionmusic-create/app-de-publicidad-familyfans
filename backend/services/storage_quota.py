from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

BASE_STORAGE_MB = 600
ADDITIONAL_PER_10_SUBS = 600

async def calculate_creator_storage_limit(db: AsyncIOMotorClient, creator_id: str) -> int:
    """Calcula el límite de almacenamiento para un creador"""
    # Contar suscriptores activos
    subscribers = await db.subscriptions.count_documents({
        "creator_id": ObjectId(creator_id),
        "active": True
    })
    
    # 600 MB base + 600 MB por cada 10 suscriptores
    additional = (subscribers // 10) * ADDITIONAL_PER_10_SUBS
    return BASE_STORAGE_MB + additional

async def get_creator_storage_usage(db: AsyncIOMotorClient, creator_id: str) -> dict:
    """Obtiene el uso actual de almacenamiento del creador"""
    # Sumar tamaño de todos los medios activos no eliminados
    media = await db.media_content.find({
        "creator_id": ObjectId(creator_id),
        "is_deleted": False,
        "expires_at": {"$gt": datetime.now()}
    }).to_list(1000)
    
    used_mb = sum(m.get("size_mb", 0) for m in media)
    limit_mb = await calculate_creator_storage_limit(db, creator_id)
    
    return {
        "used_mb": round(used_mb, 2),
        "limit_mb": limit_mb,
        "available_mb": round(max(0, limit_mb - used_mb), 2),
        "usage_percent": round((used_mb / limit_mb) * 100, 1) if limit_mb > 0 else 0
    }

async def can_upload_media(db: AsyncIOMotorClient, creator_id: str, file_size_mb: float) -> tuple[bool, str]:
    """Verifica si el creador puede subir más contenido"""
    usage = await get_creator_storage_usage(db, creator_id)
    
    if usage["available_mb"] < file_size_mb:
        return False, f"Espacio insuficiente. Disponible: {usage['available_mb']}MB, Requerido: {file_size_mb}MB"
    
    return True, "OK"

async def update_creator_storage(db: AsyncIOMotorClient, creator_id: str, size_mb: float, operation: str = "add"):
    """Actualiza el registro de almacenamiento del creador"""
    storage = await db.creator_storage.find_one({"creator_id": ObjectId(creator_id)})
    
    if storage:
        current = storage.get("used_mb", 0)
        new_value = current + size_mb if operation == "add" else current - size_mb
        await db.creator_storage.update_one(
            {"_id": storage["_id"]},
            {"$set": {"used_mb": max(0, new_value), "updated_at": datetime.now()}}
        )
    else:
        await db.creator_storage.insert_one({
            "creator_id": ObjectId(creator_id),
            "used_mb": size_mb,
            "limit_mb": await calculate_creator_storage_limit(db, creator_id),
            "updated_at": datetime.now()
        })
      
