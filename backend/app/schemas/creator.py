from typing import Optional
from pydantic import BaseModel


class PublicAddonResponse(BaseModel):
    key: str
    label: str
    price: int

    model_config = {"from_attributes": True}


class PublicPackageResponse(BaseModel):
    id: str
    tier: str
    name: str
    price: int
    deliverables: list[str]
    revisions: int
    delivery_days: int
    usage_rights: str
    analytics: bool

    model_config = {"from_attributes": True}


class PublicPortfolioResponse(BaseModel):
    id: str
    title: str
    kind: str
    url: str
    thumbnail_url: Optional[str] = None
    meta: Optional[str] = None
    sort_order: int = 0

    model_config = {"from_attributes": True}


class PublicCreatorResponse(BaseModel):
    handle: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    cover_url: Optional[str] = None
    location: Optional[str] = None
    languages: list[str] = []
    genres: list[str] = []
    platforms: dict[str, str] = {}
    total_reach: Optional[int] = None
    avg_engagement: Optional[float] = None
    on_time_rate: Optional[float] = None
    brands_count: int = 0
    packages: list[PublicPackageResponse] = []
    addons: list[PublicAddonResponse] = []
    portfolio: list[PublicPortfolioResponse] = []
