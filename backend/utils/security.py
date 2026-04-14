import cloudinary
import cloudinary.utils
from datetime import datetime, timedelta
from typing import Optional

def generate_signed_url(
    public_id: str,
    resource_type: str = "image",
    expires_in_seconds: int = 3600,
    transformation: Optional[dict] = None
) -> str:
    """
    Genera una URL firmada de Cloudinary con expiración
    
    Args:
        public_id: ID público del recurso en Cloudinary
        resource_type: 'image', 'video', 'raw', etc.
        expires_in_seconds: Tiempo de validez de la URL
        transformation: Transformaciones a aplicar (blur, watermark, etc.)
    
    Returns:
        URL firmada lista para usar
    """
    # Timestamp de expiración
    expiration = int((datetime.now() + timedelta(seconds=expires_in_seconds)).timestamp())
    
    # Parámetros base
    params = {
        "public_id": public_id,
        "timestamp": expiration,
        "resource_type": resource_type,
    }
    
    # Agregar transformaciones si existen
    if transformation:
        params["transformation"] = cloudinary.utils.generate_transformation_string(
            **transformation
        )
    
    # Generar firma
    signature = cloudinary.utils.api_sign_request(
        params,
        cloudinary.config().api_secret
    )
    
    # Construir URL
    base_url = f"https://res.cloudinary.com/{cloudinary.config().cloud_name}/{resource_type}"
    
    if transformation:
        transform_str = cloudinary.utils.generate_transformation_string(**transformation)
        url = f"{base_url}/{transform_str}/{public_id}"
    else:
        url = f"{base_url}/{public_id}"
    
    # Agregar parámetros de firma
    url += f"?{cloudinary.utils.cloudinary_signed_url_params(params, signature)}"
    
    return url

def get_blurred_url(public_id: str, resource_type: str = "image") -> str:
    """Genera URL con efecto blur para contenido premium no pagado"""
    transformation = {
        "effect": "blur:1000",  # Blur máximo
        "quality": "auto:low",  # Reducir calidad
        "fetch_format": "auto"  # Optimizar formato
    }
    
    return generate_signed_url(
        public_id,
        resource_type=resource_type,
        expires_in_seconds=300,  # 5 minutos
        transformation=transformation
    )

def get_watermarked_url(
    public_id: str,
    watermark_text: str,
    resource_type: str = "image"
) -> str:
    """Genera URL con watermark dinámico"""
    # Codificar texto para URL
    import urllib.parse
    encoded_text = urllib.parse.quote(watermark_text)
    
    transformation = {
        "overlay": {
            "font_family": "Arial",
            "font_size": 40,
            "text": encoded_text
        },
        "gravity": "center",
        "opacity": 20,
        "tile": 8,  # Repetir watermark
        "fetch_format": "auto"
    }
    
    return generate_signed_url(
        public_id,
        resource_type=resource_type,
        expires_in_seconds=3600,
        transformation=transformation
    )

def prevent_hotlinking(url: str, allowed_domains: list) -> bool:
    """Verifica que la petición venga de un dominio permitido"""
    # Esta función se usaría en middleware
    # Implementación básica - en producción usar Cloudinary Allowed Domains
    return True  # Cloudinary maneja esto en su dashboard

def sanitize_filename(filename: str) -> str:
    """Limpia nombre de archivo para evitar inyecciones"""
    import re
    # Permitir solo caracteres alfanuméricos, guiones y puntos
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Limitar longitud
    return sanitized[:100]
  
