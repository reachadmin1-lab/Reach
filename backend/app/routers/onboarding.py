from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_creator
from app.core.database import get_db
from app.models.creator_profile import CreatorProfile
from app.models.user import User
from app.schemas.onboarding import (
    GenresPatch,
    LanguagesPatch,
    OnboardingProgressResponse,
    PlatformsPatch,
    ProfilePatch,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _get_or_create_profile(user: User, db: Session) -> CreatorProfile:
    """Return the creator's profile, creating a draft if it doesn't exist yet."""
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
    if not profile:
        profile = CreatorProfile(user_id=user.id, status="draft")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/progress", response_model=OnboardingProgressResponse)
def get_progress(
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Return the creator's current onboarding state."""
    profile = _get_or_create_profile(current_user, db)
    return OnboardingProgressResponse(
        display_name=current_user.display_name,
        bio=profile.bio,
        avatar_url=current_user.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        platforms=profile.platforms or {},
        languages=profile.languages or [],
        genres=profile.genres or [],
        status=profile.status,
    )


@router.patch("/profile", response_model=OnboardingProgressResponse)
def patch_profile(
    body: ProfilePatch,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Save step 1 — basic profile fields."""
    profile = _get_or_create_profile(current_user, db)

    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.bio is not None:
        if len(body.bio) > 300:
            raise HTTPException(status_code=400, detail="Bio must be 300 characters or fewer")
        profile.bio = body.bio
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.cover_url is not None:
        profile.cover_url = body.cover_url
    if body.location is not None:
        profile.location = body.location

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return OnboardingProgressResponse(
        display_name=current_user.display_name,
        bio=profile.bio,
        avatar_url=current_user.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        platforms=profile.platforms or {},
        languages=profile.languages or [],
        genres=profile.genres or [],
        status=profile.status,
    )


@router.patch("/platforms", response_model=OnboardingProgressResponse)
def patch_platforms(
    body: PlatformsPatch,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Save step 2 — social platform handles."""
    profile = _get_or_create_profile(current_user, db)
    profile.platforms = {k: v for k, v in body.platforms.items() if v.strip()}
    db.commit()
    db.refresh(profile)
    return OnboardingProgressResponse(
        display_name=current_user.display_name,
        bio=profile.bio,
        avatar_url=current_user.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        platforms=profile.platforms or {},
        languages=profile.languages or [],
        genres=profile.genres or [],
        status=profile.status,
    )


@router.patch("/languages", response_model=OnboardingProgressResponse)
def patch_languages(
    body: LanguagesPatch,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Save step 3 — content languages."""
    profile = _get_or_create_profile(current_user, db)
    profile.languages = body.languages
    db.commit()
    db.refresh(profile)
    return OnboardingProgressResponse(
        display_name=current_user.display_name,
        bio=profile.bio,
        avatar_url=current_user.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        platforms=profile.platforms or {},
        languages=profile.languages or [],
        genres=profile.genres or [],
        status=profile.status,
    )


@router.patch("/genres", response_model=OnboardingProgressResponse)
def patch_genres(
    body: GenresPatch,
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Save step 4 — content genres (max 10)."""
    if len(body.genres) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 genres allowed")
    profile = _get_or_create_profile(current_user, db)
    profile.genres = body.genres
    db.commit()
    db.refresh(profile)
    return OnboardingProgressResponse(
        display_name=current_user.display_name,
        bio=profile.bio,
        avatar_url=current_user.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        platforms=profile.platforms or {},
        languages=profile.languages or [],
        genres=profile.genres or [],
        status=profile.status,
    )
