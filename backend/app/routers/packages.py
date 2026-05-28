import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_creator
from app.core.database import get_db
from app.models.creator_profile import CreatorProfile
from app.models.package import Package, PackageAddon
from app.models.user import User
from app.schemas.package import PackageResponse, PackagesPatch

router = APIRouter(tags=["packages"])

TIER_NAMES = {
    "basic":    "Basic",
    "standard": "Standard",
    "premium":  "Premium",
    "campaign": "Campaign",
}

ADDON_LABELS = {
    "commercial":  "Commercial usage rights",
    "revision":    "Additional revision",
    "rush":        "Rush delivery (48h)",
    "exclusivity": "Extended exclusivity (14 days)",
}


def _to_paise(val: str) -> int:
    """Convert a price string to paise, returning 0 for empty/invalid."""
    try:
        return int(float(val) * 100) if val and str(val).strip() else 0
    except (ValueError, TypeError):
        return 0


@router.get("/packages/my", response_model=list[PackageResponse])
def get_my_packages(
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    packages = db.query(Package).filter(
        Package.creator_id == current_user.id,
        Package.is_active == True,
    ).all()
    return [
        PackageResponse(
            id=str(p.id),
            tier=p.tier,
            name=p.name,
            price=p.price,
            deliverables=p.deliverables or [],
            revisions=p.revisions,
            delivery_days=p.delivery_days,
            usage_rights=p.usage_rights,
            analytics=p.analytics,
            is_active=p.is_active,
        )
        for p in packages
    ]


@router.patch("/onboarding/packages")
def save_packages(
    body: PackagesPatch,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Upsert packages and add-ons for the creator (step 6)."""
    for tier_key, config in body.tiers.items():
        if tier_key not in ("basic", "standard", "premium"):
            continue
        price_paise = _to_paise(config.price)
        deliverables = [d.strip() for d in config.deliverables.split("\n") if d.strip()]

        existing = db.query(Package).filter(
            Package.creator_id == current_user.id,
            Package.tier == tier_key,
        ).first()

        if existing:
            existing.price = price_paise
            existing.deliverables = deliverables
            existing.revisions = config.revisions
            existing.delivery_days = config.delivery_days
            existing.usage_rights = config.usage_rights
            existing.analytics = config.analytics
        else:
            db.add(Package(
                creator_id=current_user.id,
                tier=tier_key,
                name=TIER_NAMES[tier_key],
                price=price_paise,
                deliverables=deliverables,
                revisions=config.revisions,
                delivery_days=config.delivery_days,
                usage_rights=config.usage_rights,
                analytics=config.analytics,
            ))

    # Campaign package
    campaign_price = _to_paise(body.campaign_price)
    existing_campaign = db.query(Package).filter(
        Package.creator_id == current_user.id,
        Package.tier == "campaign",
    ).first()
    if body.campaign_enabled:
        if existing_campaign:
            existing_campaign.price = campaign_price
            existing_campaign.is_active = True
        else:
            db.add(Package(
                creator_id=current_user.id,
                tier="campaign",
                name="Campaign",
                price=campaign_price,
                deliverables=[],
                revisions=1,
                delivery_days=30,
            ))
    elif existing_campaign:
        existing_campaign.is_active = False

    # Add-ons
    for key, addon in body.addons.items():
        if key not in ADDON_LABELS:
            continue
        price_paise = _to_paise(addon.price)
        existing_addon = db.query(PackageAddon).filter(
            PackageAddon.creator_id == current_user.id,
            PackageAddon.key == key,
        ).first()
        if existing_addon:
            existing_addon.price = price_paise
            existing_addon.is_active = addon.enabled
        elif addon.enabled:
            db.add(PackageAddon(
                creator_id=current_user.id,
                key=key,
                label=ADDON_LABELS[key],
                price=price_paise,
                is_active=True,
            ))

    db.commit()
    return {"ok": True}


@router.post("/onboarding/submit", status_code=status.HTTP_200_OK)
def submit_for_review(
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Validate all steps complete and set profile status to under_review."""
    profile = db.query(CreatorProfile).filter(
        CreatorProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    errors = []
    if not current_user.display_name:
        errors.append("Display name is required")
    if not profile.bio:
        errors.append("Bio is required")
    if not profile.platforms:
        errors.append("At least one platform is required")
    if not profile.languages:
        errors.append("At least one language is required")
    if not profile.genres:
        errors.append("At least one genre is required")

    packages = db.query(Package).filter(
        Package.creator_id == current_user.id,
        Package.is_active == True,
    ).all()
    tier_keys = {p.tier for p in packages}
    if "basic" not in tier_keys or "standard" not in tier_keys:
        errors.append("Basic and Standard packages are required")

    if errors:
        raise HTTPException(status_code=400, detail=errors)

    profile.status = "under_review"
    profile.submitted_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "under_review"}


@router.get("/creators/check-handle")
def check_handle(
    handle: str,
    db: Session = Depends(get_db),
):
    """Check if a handle is available. Public endpoint — no auth required."""
    handle_re = re.compile(r"^[a-z0-9._]{3,30}$")
    if not handle_re.match(handle):
        return {"available": False, "reason": "invalid_format"}

    existing = db.query(User).filter(User.handle == handle).first()
    return {"available": existing is None}
