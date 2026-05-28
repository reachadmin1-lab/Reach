import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_creator
from app.core.config import settings
from app.core.database import get_db
from app.models.portfolio import PortfolioItem
from app.models.user import User
from app.schemas.portfolio import PortfolioItemResponse, PortfolioReorderRequest

router = APIRouter(prefix="/onboarding/portfolio", tags=["portfolio"])

ALLOWED_TYPES = {
    "image/jpeg": ("image", ".jpg"),
    "image/png":  ("image", ".png"),
    "video/mp4":  ("video", ".mp4"),
    "video/quicktime": ("video", ".mov"),
    "application/pdf": ("pdf", ".pdf"),
}
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


async def _upload_to_storage(file: UploadFile, content: bytes, creator_id: str) -> tuple[str, Optional[str]]:
    """
    Upload file to Supabase Storage.
    Falls back to a placeholder URL if storage is not configured or fails.
    Returns (public_url, thumbnail_url).
    """
    import httpx

    ext = ALLOWED_TYPES[file.content_type][1]
    filename = f"{creator_id}/{uuid.uuid4()}{ext}"

    supabase_url = settings.supabase_url
    service_key = settings.supabase_service_role_key

    if not supabase_url or not service_key:
        return f"/uploads/{filename}", None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{supabase_url}/storage/v1/object/portfolio/{filename}",
                content=content,
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": file.content_type or "application/octet-stream",
                },
                timeout=30,
            )
            if resp.status_code == 400:
                # Bucket likely doesn't exist — try to create it first
                await client.post(
                    f"{supabase_url}/storage/v1/bucket",
                    json={"id": "portfolio", "name": "portfolio", "public": True},
                    headers={
                        "Authorization": f"Bearer {service_key}",
                        "Content-Type": "application/json",
                    },
                )
                # Retry upload
                resp = await client.post(
                    f"{supabase_url}/storage/v1/object/portfolio/{filename}",
                    content=content,
                    headers={
                        "Authorization": f"Bearer {service_key}",
                        "Content-Type": file.content_type or "application/octet-stream",
                    },
                    timeout=30,
                )
            resp.raise_for_status()
        public_url = f"{supabase_url}/storage/v1/object/public/portfolio/{filename}"
        return public_url, None
    except Exception:
        # Fallback — return placeholder so onboarding isn't blocked
        return f"/uploads/{filename}", None


@router.post("", response_model=PortfolioItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_portfolio_item(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Upload a portfolio file and create a portfolio_item record."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Check size
    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 100MB limit")
    await file.seek(0)

    kind = ALLOWED_TYPES[file.content_type][0]
    public_url, thumbnail_url = await _upload_to_storage(file, content, str(current_user.id))

    # Build meta string
    size_mb = round(len(content) / (1024 * 1024), 1)
    ext = ALLOWED_TYPES[file.content_type][1].lstrip(".").upper()
    meta = f"{ext} · {size_mb}MB"

    item = PortfolioItem(
        creator_id=current_user.id,
        title=file.filename or "Untitled",
        kind=kind,
        url=public_url,
        thumbnail_url=thumbnail_url,
        meta=meta,
        sort_order=db.query(PortfolioItem).filter(PortfolioItem.creator_id == current_user.id).count(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return PortfolioItemResponse(
        id=str(item.id),
        title=item.title,
        kind=item.kind,
        url=item.url,
        thumbnail_url=item.thumbnail_url,
        meta=item.meta,
        sort_order=item.sort_order,
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio_item(
    item_id: str,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Remove a portfolio item."""
    item = db.query(PortfolioItem).filter(
        PortfolioItem.id == item_id,
        PortfolioItem.creator_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    db.delete(item)
    db.commit()


@router.patch("/reorder", status_code=status.HTTP_200_OK)
def reorder_portfolio(
    body: PortfolioReorderRequest,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Update sort_order for all portfolio items."""
    for entry in body.items:
        item = db.query(PortfolioItem).filter(
            PortfolioItem.id == entry["id"],
            PortfolioItem.creator_id == current_user.id,
        ).first()
        if item:
            item.sort_order = entry["sort_order"]
    db.commit()
    return {"ok": True}
