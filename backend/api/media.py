from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from typing import Optional, List
from services.cloudinary_service import cloudinary_service
from auth import get_current_user, require_creator, require_advertiser
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/api/media", tags=["Media"])

class MediaUploadResponse(BaseModel):
    success: bool
    public_id: Optional[str] = None
    url: Optional[str] = None
    format: Optional[str] = None
    duration: Optional[float] = None
    bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    error: Optional[str] = None

class MediaDeleteResponse(BaseModel):
    success: bool
    message: str

@router.post("/upload/video", response_model=MediaUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    folder: str = Form(default="campaigns"),
    current_user=Depends(get_current_user)
):
    """
    Sube un video a Cloudinary
    Solo usuarios autenticados pueden subir videos
    """
    # Validar tipo de archivo
    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo videos MP4, MOV, AVI o WebM")
    
    # Validar tamaño (max 500MB)
    max_size = 500 * 1024 * 1024  # 500MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="El video no puede superar los 500MB")
    
    # Generar public_id único
    public_id = f"{current_user['sub']}/{folder}/{uuid.uuid4().hex}"
    
    # Subir a Cloudinary
    result = cloudinary_service.upload_video(
        file=content,
        public_id=public_id,
        folder=folder
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Error al subir video"))
    
    return MediaUploadResponse(**result)

@router.post("/upload/image", response_model=MediaUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form(default="profiles"),
    current_user=Depends(get_current_user)
):
    """
    Sube una imagen a Cloudinary
    """
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo JPEG, PNG o WebP")
    
    # Validar tamaño (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="La imagen no puede superar los 10MB")
    
    # Generar public_id único
    public_id = f"{current_user['sub']}/{folder}/{uuid.uuid4().hex}"
    
    # Subir a Cloudinary
    result = cloudinary_service.upload_image(
        file=content,
        public_id=public_id,
        folder=folder
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Error al subir imagen"))
    
    return MediaUploadResponse(**result)

@router.get("/signed-url/{public_id}")
async def get_signed_url(
    public_id: str,
    resource_type: str = Query(default="video", regex="^(video|image)$"),
    expires_in: int = Query(default=3600, ge=300, le=86400),
    current_user=Depends(get_current_user)
):
    """
    Genera una URL firmada para acceder a un recurso
    expires_in: tiempo en segundos (mínimo 300, máximo 86400)
    """
    try:
        url = cloudinary_service.generate_signed_url(
            public_id=public_id,
            resource_type=resource_type,
            expires_in=expires_in
        )
        return {"url": url, "expires_in": expires_in}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{public_id}", response_model=MediaDeleteResponse)
async def delete_media(
    public_id: str,
    resource_type: str = Query(default="video", regex="^(video|image)$"),
    current_user=Depends(get_current_user)
):
    """
    Elimina un recurso de Cloudinary
    Solo el propietario puede eliminar sus recursos
    """
    # Verificar que el public_id pertenezca al usuario
    if not public_id.startswith(current_user['sub']):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este recurso")
    
    result = cloudinary_service.delete_resource(
        public_id=public_id,
        resource_type=resource_type
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Error al eliminar recurso"))
    
    return MediaDeleteResponse(success=True, message="Recurso eliminado correctamente")

@router.get("/info/{public_id}")
async def get_media_info(
    public_id: str,
    current_user=Depends(get_current_user)
):
    """
    Obtiene información de un video
    """
    result = cloudinary_service.get_video_info(public_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Recurso no encontrado"))
    
    return result["info"]
  
