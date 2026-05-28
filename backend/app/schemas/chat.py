from typing import Optional
from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str
    kind: str = "text"


class MessageResponse(BaseModel):
    id: str
    order_id: str
    sender_id: Optional[str] = None
    kind: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}


class ThreadResponse(BaseModel):
    order_id: str
    order_ref: str
    other_party_name: str
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0
