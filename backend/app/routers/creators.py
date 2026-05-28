import io

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.creator_profile import CreatorProfile
from app.models.package import Package, PackageAddon
from app.models.portfolio import PortfolioItem
from app.models.user import User
from app.schemas.creator import PublicCreatorResponse

router = APIRouter(prefix="/creators", tags=["creators"])


@router.get("/{handle}", response_model=PublicCreatorResponse)
def get_public_profile(handle: str, db: Session = Depends(get_db)):
    """
    Public creator profile — used by the ISR page.
    Returns 404 if the creator doesn't exist or their profile isn't active.
    """
    user = db.query(User).filter(User.handle == handle).first()
    if not user:
        raise HTTPException(status_code=404, detail="Creator not found")

    profile = db.query(CreatorProfile).filter(
        CreatorProfile.user_id == user.id,
        CreatorProfile.status == "active",
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator profile not found or not active")

    packages = (
        db.query(Package)
        .filter(Package.creator_id == user.id, Package.is_active == True)
        .order_by(Package.tier)
        .all()
    )
    addons = (
        db.query(PackageAddon)
        .filter(PackageAddon.creator_id == user.id, PackageAddon.is_active == True)
        .all()
    )
    portfolio = (
        db.query(PortfolioItem)
        .filter(PortfolioItem.creator_id == user.id)
        .order_by(PortfolioItem.sort_order)
        .all()
    )

    return PublicCreatorResponse(
        handle=user.handle or handle,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=profile.bio,
        cover_url=profile.cover_url,
        location=profile.location,
        languages=profile.languages or [],
        genres=profile.genres or [],
        platforms=profile.platforms or {},
        total_reach=profile.total_reach,
        avg_engagement=float(profile.avg_engagement) if profile.avg_engagement else None,
        on_time_rate=float(profile.on_time_rate) if profile.on_time_rate else None,
        brands_count=profile.brands_count,
        packages=packages,
        addons=addons,
        portfolio=portfolio,
    )


@router.get("/{handle}/qr")
def get_qr_code(handle: str, db: Session = Depends(get_db)):
    """Generate a QR code PNG for the creator's booking URL."""
    import qrcode

    user = db.query(User).filter(User.handle == handle).first()
    if not user:
        raise HTTPException(status_code=404, detail="Creator not found")

    booking_url = f"https://reach.app/@{handle}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(booking_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0B0B0F", back_color="#F7F4EE")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
