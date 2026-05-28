from typing import Optional
from pydantic import BaseModel


class TierConfig(BaseModel):
    price: str = "0"
    revisions: int = 1
    delivery_days: int = 7
    usage_rights: str = "personal"
    analytics: bool = False
    deliverables: str = ""


class AddonConfig(BaseModel):
    enabled: bool = False
    price: str = "0"


class PackagesPatch(BaseModel):
    tiers: dict[str, TierConfig] = {}
    addons: dict[str, AddonConfig] = {}
    campaign_enabled: bool = False
    campaign_price: str = "0"


class PackageResponse(BaseModel):
    id: str
    tier: str
    name: str
    price: int
    deliverables: list[str]
    revisions: int
    delivery_days: int
    usage_rights: str
    analytics: bool
    is_active: bool

    model_config = {"from_attributes": True}
