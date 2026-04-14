import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class CloudinaryService:
    def __init__(self):
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET'),
            secure=True
        )
    
    def upload_video(self, file, public_id: Optional[str] = None, folder: str = "videos") -> Dict[str, Any]:
        """
        Sube un video a Cloudinary
        """
        try:
            upload_result = cloudinary.uploader.upload(
                file,
                resource_type="video",
                public_id=public_id,
                folder=folder,
                resource_type="video",
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
            return {
                "success": False,
                "error": str(e)
            }
    
    def upload_image(self, file, public_id: Optional[str] = None, folder: str = "images") -> Dict[str, Any]:
        """
        Sube una imagen a Cloudinary
        """
        try:
            upload_result = cloudinary.uploader.upload(
                file,
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
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_signed_url(self, public_id: str, resource_type: str = "video", expires_in: int = 3600) -> str:
        """
        Genera una URL firmada para acceso temporal a un recurso
        """
        try:
            expiration_time = int(datetime.now().timestamp()) + expires_in
            
            url = cloudinary_url(
                public_id,
                resource_type=resource_type,
                secure=True,
                sign_url=True,
                expires_at=expiration_time
            )[0]
            
            return url
        except Exception as e:
            raise Exception(f"Error generando URL firmada: {str(e)}")
    
    def delete_resource(self, public_id: str, resource_type: str = "video") -> Dict[str, Any]:
        """
        Elimina un recurso de Cloudinary
        """
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return {
                "success": True,
                "result": result.get("result")
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_video_info(self, public_id: str) -> Dict[str, Any]:
        """
        Obtiene información de un video
        """
        try:
            info = cloudinary.api.resource(public_id, resource_type="video")
            return {
                "success": True,
                "info": info
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Instancia global del servicio
cloudinary_service = CloudinaryService()
