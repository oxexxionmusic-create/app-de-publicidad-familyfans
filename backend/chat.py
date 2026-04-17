# chat.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    CUSTOM_CONTENT = "custom_content"
    IMAGE = "image"
    VIDEO = "video"

class ChatMessageCreate(BaseModel):
    recipient_id: str
    type: MessageType
    content: str  # Texto o URL de Cloudinary
    is_paid: bool = False
    price: Optional[float] = Field(None, ge=0)
    duration: Optional[int] = Field(None, ge=1, le=420)  # Para audio/video
    cloudinary_public_id: Optional[str] = None
    
    @validator('price')
    def validate_price(cls, v, values):
        if values.get('is_paid') and (v is None or v <= 0):
            raise ValueError('El precio es requerido para contenido pago')
        return v
    
    @validator('duration')
    def validate_duration(cls, v, values):
        if values.get('type') in [MessageType.AUDIO, MessageType.VIDEO]:
            if v is None:
                raise ValueError('La duración es requerida para audio/video')
            if values.get('type') == MessageType.AUDIO and v > 40:
                raise ValueError('El audio no puede superar 40 segundos en chat')
        return v

class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    recipient_id: str
    type: MessageType
    content: str
    is_paid: bool
    price: Optional[float]
    is_blurred: bool
    duration: Optional[int]
    cloudinary_public_id: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ChatConversation(BaseModel):
    other_user_id: str
    other_user_name: str
    other_user_photo: Optional[str]
    last_message: Optional[str]
    last_message_at: datetime
    unread_count: int
    
    class Config:
        from_attributes = True

class PaymentRequest(BaseModel):
    message_id: str
    payment_method: str = "balance"  # "balance" o "crypto"
