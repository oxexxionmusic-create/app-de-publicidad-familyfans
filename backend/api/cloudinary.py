from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
import cloudinary
import cloudinary.api
from datetime import datetime, timedelta

from auth import require_admin

router = APIRouter(prefix="/api/cloudinary", tags=["cloudinary"])

@router.post("/sign-upload")
async def sign_upload_request(
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """Genera firma para upload directo a Cloudinary desde frontend"""
    try:
        data = await request.json()
        
        # Parámetros requeridos
        params = {
            "timestamp": int(datetime.now().timestamp()),
            "folder": data.get("folder", "user_uploads"),
            "public_id_prefix": data.get("public_id_prefix", ""),
            "resource_type": data.get("resource_type", "image"),
        }
        
        # Generar firma
        signature = cloudinary.utils.api_sign_request(
            params,
            cloudinary.config().api_secret
        )
        
        return {
            "signature": signature,
            "timestamp": params["timestamp"],
            "api_key": cloudinary.config().api_key,
            "cloud_name": cloudinary.config().cloud_name
        }
    except Exception as e:
        raise HTTPException(500, f"Error al generar firma: {str(e)}")

@router.post("/webhook")
async def cloudinary_webhook(request: Request):
    """Webhook para notificaciones de Cloudinary (opcional)"""
    try:
        # Verificar firma del webhook (recomendado para producción)
        # signature = request.headers.get("X-Cld-Signature")
        
        data = await request.json()
        
        # Procesar evento
        event_type = data.get("event_type")
        public_id = data.get("public_id")
        
        if event_type == "delete":
            # Actualizar registros en MongoDB si se eliminó en Cloudinary
            from server import db
            await db.media_content.update_many(
                {"cloudinary_public_id": public_id},
                {"$set": {"is_deleted": True, "deleted_at": datetime.now().isoformat()}}
            )
        
        return JSONResponse({"status": "ok"})
    except Exception as e:
        # No retornar error para no causar reintentos infinitos
        return JSONResponse({"status": "error", "message": str(e)}, status_code=200)

@router.get("/usage")
async def get_cloudinary_usage(current_user: dict = Depends(require_admin)):
    """Obtiene estadísticas de uso de Cloudinary"""
    try:
        usage = cloudinary.api.usage()
        return {
            "used": usage.get("usage", {}),
            "last_updated": usage.get("last_updated")
        }
    except Exception as e:
        raise HTTPException(500, f"Error al obtener uso: {str(e)}")
      
