import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.auth import _verify_jwt, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserSyncRequest, UserResponse, UserUpdateRequest

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer()

HANDLE_RE = re.compile(r"^[a-z0-9._]{3,30}$")


@router.get("/debug-token")
def debug_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Temporary debug endpoint — remove before production."""
    import base64, json
    import jwt as pyjwt

    token = credentials.credentials
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": "not a JWT"}
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        # Try verifying with decoded bytes
        secret = settings.supabase_jwt_secret
        decoded_secret = base64.b64decode(secret)

        result_bytes = None
        result_raw = None
        err_bytes = None
        err_raw = None

        try:
            result_bytes = pyjwt.decode(token, decoded_secret, algorithms=["HS256"], options={"verify_aud": False})
        except Exception as e:
            err_bytes = str(e)

        try:
            result_raw = pyjwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        except Exception as e:
            err_raw = str(e)

        return {
            "token_claims": {
                "sub": payload.get("sub"),
                "iss": payload.get("iss"),
                "role": payload.get("role"),
                "exp": payload.get("exp"),
                "aud": payload.get("aud"),
            },
            "secret_len": len(secret),
            "decoded_secret_len": len(decoded_secret),
            "verify_with_decoded_bytes": "OK" if result_bytes else f"FAIL: {err_bytes}",
            "verify_with_raw_string": "OK" if result_raw else f"FAIL: {err_raw}",
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/sync", response_model=UserResponse, status_code=status.HTTP_200_OK)
def sync_user(
    body: UserSyncRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Called by the frontend immediately after Supabase login.
    Creates the user row if it doesn't exist, or updates it on subsequent calls.
    The Supabase user ID (sub claim) becomes our primary key.
    """
    payload = _verify_jwt(credentials.credentials, settings.supabase_jwt_secret)
    supabase_uid: str = payload.get("sub", "")
    if not supabase_uid:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Validate role
    if body.role not in ("creator", "brand"):
        raise HTTPException(status_code=400, detail="role must be 'creator' or 'brand'")

    # Validate handle format
    if not HANDLE_RE.match(body.handle):
        raise HTTPException(
            status_code=400,
            detail="Handle must be 3–30 chars, lowercase alphanumeric, dots, or underscores",
        )

    user = db.query(User).filter(User.id == supabase_uid).first()

    if user is None:
        # Check handle uniqueness (only for new users)
        existing_handle = db.query(User).filter(
            User.handle == body.handle,
            User.id != supabase_uid,
        ).first()
        if existing_handle:
            raise HTTPException(status_code=409, detail="Handle already taken")

        try:
            user = User(
                id=supabase_uid,
                email=body.email,
                phone=body.phone,
                role=body.role,
                handle=body.handle,
                display_name=body.display_name,
                avatar_url=body.avatar_url,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            # Race condition — another request already inserted this user
            db.rollback()
            user = db.query(User).filter(User.id == supabase_uid).first()
            if not user:
                raise HTTPException(status_code=500, detail="Failed to create user")
    else:
        # Update mutable fields on subsequent syncs
        if body.display_name is not None:
            user.display_name = body.display_name
        if body.avatar_url is not None:
            user.avatar_url = body.avatar_url
        if body.phone is not None:
            user.phone = body.phone
        db.commit()
        db.refresh(user)

    # Serialize UUID to string for response
    return UserResponse(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        role=user.role,
        handle=user.handle,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        handle=current_user.handle,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update mutable user settings."""
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.phone is not None:
        current_user.phone = body.phone
    db.commit()
    db.refresh(current_user)
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        handle=current_user.handle,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )
