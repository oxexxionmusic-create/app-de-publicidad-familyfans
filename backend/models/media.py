from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"

class ExpirationPeriod(str, Enum):
    ONE_DAY = "1_day"
    THREE_DAYS = "3_days"
    ONE_WEEK = "1_week"
    ONE_MONTH = "1_month"

EXPIRATION_DAYS = {
    ExpirationPeriod.ONE_DAY: 1,
    ExpirationPeriod.THREE_DAYS: 3,
    ExpirationPeriod.ONE_WEEK: 7,
    ExpirationPeriod.ONE_MONTH: 30
}

class MediaUploadRequest(BaseModel):
    type: MediaType
    expiration: ExpirationPeriod
    description: Optional[str] = Field(None, max_length=500)
    is_premium: bool = False
    price: Optional[float] = Field(None, ge=0)
    
    @validator('price')
    def validate_price(cls, v, values):
        if values.get('is_premium') and (v is None or v <= 0):
            raise ValueError('El precio es requerido para contenido premium')
        return v

class MediaContentCreate(BaseModel):
    creator_id: str
    cloudinary_public_id: str
    cloudinary_url: str
    secure_url: str
    type: MediaType
    size_mb: float
    duration_seconds: Optional[int]
    expiration_days: int
    expires_at: datetime
    description: Optional[str]
    is_premium: bool
    price: Optional[float]
    
    class Config:
        from_attributes = True

class MediaContentResponse(BaseModel):
    id: str
    creator_id: str
    creator_name: str
    cloudinary_url: str
    secure_url: str
    type: MediaType
    size_mb: float
    duration_seconds: Optional[int]
    expiration_days: int
    expires_at: datetime
    description: Optional[str]
    is_premium: bool
    price: Optional[float]
    is_subscribed: bool  # Si el fan está suscrito
    is_paid: bool  # Si el fan ya pagó por este contenido
    created_at: datetime
    
    class Config:
        from_attributes = True

class MediaDeleteRequest(BaseModel):
    media_ids: List[str]
  
