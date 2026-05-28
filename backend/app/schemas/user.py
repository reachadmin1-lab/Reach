from typing import Optional
from pydantic import BaseModel, EmailStr


class UserSyncRequest(BaseModel):
    """Payload sent by the frontend on first login to sync the Supabase user into our DB."""
    email: EmailStr
    phone: Optional[str] = None
    role: str           # 'creator' | 'brand'
    handle: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    role: str
    handle: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
