from typing import Optional
from pydantic import BaseModel


class PortfolioItemResponse(BaseModel):
    id: str
    title: str
    kind: str
    url: str
    thumbnail_url: Optional[str] = None
    meta: Optional[str] = None
    sort_order: int = 0

    model_config = {"from_attributes": True}


class PortfolioReorderRequest(BaseModel):
    # List of {id, sort_order} pairs
    items: list[dict]
