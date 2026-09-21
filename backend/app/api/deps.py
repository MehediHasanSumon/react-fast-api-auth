from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User, UserStatus


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for obtaining a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract JWT token with preference for HttpOnly Cookie,
    falling back to Authorization Bearer header.
    """
    # 1. HttpOnly cookie check
    cookie_token = request.cookies.get(settings.COOKIE_NAME_ACCESS)
    if cookie_token and cookie_token.strip():
        return cookie_token.strip()

    # 2. Authorization header fallback
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ", 1)
        if len(parts) == 2 and parts[1].strip():
            return parts[1].strip()

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    Verify authenticated session/JWT and return current User record.
    """
    token = get_token_from_request(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or removed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate user status
    if user.status == UserStatus.BANED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been banned. Please contact administration.",
        )
    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is temporarily blocked for security reasons.",
        )
    if user.status == UserStatus.DEACTIVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the authenticated user is in active status.
    """
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account.",
        )
    return current_user


ENABLE_PERMISSION_ENFORCEMENT: bool = False  # Set to True when ready to enforce RBAC permissions


def check_permission(*permission_names: str):
    """
    FastAPI dependency factory to enforce strict permission-based authorization.
    Verifies that the authenticated user possesses at least one of the specified permissions
    (either directly or inherited through any assigned role).
    Super Admin role automatically possesses all permissions.
    When ENABLE_PERMISSION_ENFORCEMENT is False, checks are bypassed for straightforward CRUD.
    """
    def permission_checker(
        request: Request,
        db: Session = Depends(get_db),
    ) -> Optional[User]:
        if not ENABLE_PERMISSION_ENFORCEMENT:
            return None

        current_user = get_current_active_user(get_current_user(request, db))
        user_roles = [r.lower() for r in current_user.get_role_names()]
        if "super admin" in user_roles or "admin" in user_roles:
            return current_user

        user_perms = current_user.get_all_permissions()
        if any(p in user_perms for p in permission_names):
            return current_user

        perms_str = ", ".join(f"'{p}'" for p in permission_names)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Missing required permission ({perms_str}).",
        )

    return permission_checker

