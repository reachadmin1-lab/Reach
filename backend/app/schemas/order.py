from typing import Optional
from pydantic import BaseModel


class OrderCreateRequest(BaseModel):
    creator_handle: str
    package_id: str
    addon_keys: list[str] = []
    brief: Optional[str] = None


class DeliverableResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    sort_order: int

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: str
    order_ref: str
    creator_id: str
    brand_id: str
    package_id: str
    addons: list
    brief: Optional[str] = None
    amount: int
    platform_fee: int
    creator_payout: int
    status: str
    deliverables: list[DeliverableResponse] = []
    created_at: str

    model_config = {"from_attributes": True}
