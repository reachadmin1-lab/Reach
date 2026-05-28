from typing import Optional
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt as pyjwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()

# Supabase JWKS endpoint — used to verify RS256 tokens
JWKS_URL = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"

# Cache the JWKS in memory (refreshed on startup)
_jwks_cache: Optional[dict] = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


def _verify_jwt(token: str, jwt_secret: str) -> dict:
    """
    Verify a Supabase JWT.
    Newer Supabase projects use ES256 (asymmetric) — verified via JWKS.
    Older projects use HS256 — verified with the JWT secret.
    We detect the algorithm from the token header and handle both.
    """
    import base64
    import json
    import httpx

    # Decode header to check algorithm
    try:
        header_b64 = token.split(".")[0]
        header_b64 += "=" * (4 - len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        alg = header.get("alg", "HS256")
        kid = header.get("kid")
    except Exception:
        alg = "HS256"
        kid = None

    if alg == "ES256":
        # Fetch JWKS and verify with the matching public key
        try:
            resp = httpx.get(
                f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
                timeout=10,
            )
            resp.raise_for_status()
            jwks = resp.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not fetch JWKS for token verification",
            ) from e

        # Find the matching key by kid
        keys = jwks.get("keys", [])
        matching_key = None
        for k in keys:
            if kid and k.get("kid") == kid:
                matching_key = k
                break
        if not matching_key and keys:
            matching_key = keys[0]  # fallback to first key

        if not matching_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No matching public key found",
            )

        try:
            from jwt.algorithms import ECAlgorithm
            public_key = ECAlgorithm.from_jwk(matching_key)
            payload = pyjwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
            return payload
        except pyjwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            ) from e
    else:
        # HS256 — use JWT secret
        secrets_to_try = [jwt_secret]
        try:
            secrets_to_try.append(base64.b64decode(jwt_secret))
        except Exception:
            pass

        last_err = None
        for secret in secrets_to_try:
            try:
                payload = pyjwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
                return payload
            except pyjwt.PyJWTError as e:
                last_err = e
                continue

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from last_err


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header
    2. Verifies it against the Supabase JWT secret
    3. Looks up (or raises 401) the corresponding User row
    """
    token = credentials.credentials
    payload = _verify_jwt(token, settings.supabase_jwt_secret)

    supabase_uid: Optional[str] = payload.get("sub")
    if not supabase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    user = db.query(User).filter(User.id == supabase_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — call /auth/sync first",
        )

    return user


def get_current_creator(user: User = Depends(get_current_user)) -> User:
    """Dependency that additionally enforces the creator role."""
    if user.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creator access required",
        )
    return user


def get_current_brand(user: User = Depends(get_current_user)) -> User:
    """Dependency that additionally enforces the brand role."""
    if user.role != "brand":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Brand access required",
        )
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency that additionally enforces the admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
