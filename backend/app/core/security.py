import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from urllib.parse import quote, unquote
import bcrypt
import jwt
from fastapi import Response
from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate a signed JWT access token.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a signed JWT refresh token.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_hex(16),
    }

    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a signed JWT token.
    Returns decoded dictionary or None if invalid/expired.
    """
    try:
        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return decoded
    except (jwt.PyJWTError, Exception):
        return None


def generate_opaque_token(nbytes: int = 32) -> str:
    """
    Generate a cryptographically secure URL-safe random string.
    """
    return secrets.token_urlsafe(nbytes)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: Optional[str] = None,
    remember_me: bool = False,
    user_display: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Attach HttpOnly authentication cookies to an outgoing HTTP response,
    plus an optional client-readable user_display cookie (no tokens) for zero-API UI reload.
    """
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # 1. HttpOnly Access Token Cookie
    response.set_cookie(
        key=settings.COOKIE_NAME_ACCESS,
        value=access_token,
        max_age=access_max_age,
        expires=access_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
    )

    # 2. HttpOnly Refresh Token Cookie
    if refresh_token:
        if remember_me:
            refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        else:
            refresh_max_age = 7 * 24 * 60 * 60

        response.set_cookie(
            key=settings.COOKIE_NAME_REFRESH,
            value=refresh_token,
            max_age=refresh_max_age,
            expires=refresh_max_age,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path=settings.COOKIE_PATH,
            domain=settings.COOKIE_DOMAIN,
        )

    # 3. Client-readable Display Profile Cookie (Non-sensitive: contains NO secret tokens)
    if user_display:
        display_max_age = (
            settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            if remember_me
            else 7 * 24 * 60 * 60
        )
        serialized = quote(json.dumps(user_display, default=str))
        response.set_cookie(
            key=settings.COOKIE_NAME_USER_DISPLAY,
            value=serialized,
            max_age=display_max_age,
            expires=display_max_age,
            httponly=False,  # Accessible to client JS for immediate zero-API UI display
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path=settings.COOKIE_PATH,
            domain=settings.COOKIE_DOMAIN,
        )


def clear_auth_cookies(response: Response) -> None:
    """
    Instruct the browser to delete all authentication and display cookies.
    """
    response.delete_cookie(
        key=settings.COOKIE_NAME_ACCESS,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.COOKIE_NAME_REFRESH,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.COOKIE_NAME_USER_DISPLAY,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
