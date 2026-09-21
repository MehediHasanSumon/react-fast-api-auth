from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session as OrmSession

from app.api.deps import get_current_user, get_db, get_token_from_request
from app.core.config import settings
from app.core.decorators import current_user, require_auth
from app.core.security import (
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_opaque_token,
    hash_password,
    set_auth_cookies,
    verify_password,
)
from app.models.session import Session as UserSession
from app.models.user import User, UserStatus
from app.schemas.auth import (
    AuthResponse,
    MessageResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserSessionResponse,
)

router = APIRouter()


def _extract_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Safely extract client IP address and user-agent string.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = None

    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 500:
        user_agent = user_agent[:500]

    return client_ip, user_agent


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User Registration",
    description="Register a new user, issue HttpOnly cookies, and create an active session.",
)
def register(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    # 1. Check if email already registered
    existing_user = (
        db.query(User).filter(User.email == payload.email.lower().strip()).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 2. Check mobile number uniqueness if provided
    if payload.mobile_number and payload.mobile_number.strip():
        existing_mobile = (
            db.query(User)
            .filter(User.mobile_number == payload.mobile_number.strip())
            .first()
        )
        if existing_mobile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this contact number already exists.",
            )

    # 3. Hash password
    password_hash = hash_password(payload.password)

    # 4. Create new User
    new_user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        mobile_number=payload.mobile_number.strip() if payload.mobile_number else None,
        avatar=payload.avatar.strip() if payload.avatar else None,
        password=password_hash,
        is_verified=False,
        status=UserStatus.ACTIVE,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5. Create active session and issue tokens
    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)
    session_token = generate_opaque_token(32)

    client_ip, user_agent = _extract_client_info(request)
    session_expiry = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    user_session = UserSession(
        user_id=new_user.id,
        session_token=session_token,
        refresh_token=refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
        is_active=True,
        expires_at=session_expiry,
    )
    db.add(user_session)
    db.commit()

    # 6. Set HttpOnly authentication cookies & client display cookie
    user_display = {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "status": new_user.status.value,
        "mobile_number": new_user.mobile_number,
        "is_verified": new_user.is_verified,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
    }
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=False,
        user_display=user_display,
    )

    return AuthResponse(
        message="Account registered successfully.",
        user=UserResponse.model_validate(new_user),
        token_type="Bearer",
        access_token=access_token,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="User Login",
    description="Authenticate credentials, record a session, and set HttpOnly cookies.",
)
def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    # 1. Fetch user by email
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify account status
    if user.status == UserStatus.BANED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been banned. Please contact system administrator.",
        )
    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been blocked for security reasons.",
        )
    if user.status == UserStatus.DEACTIVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    # 3. Issue tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    session_token = generate_opaque_token(32)

    client_ip, user_agent = _extract_client_info(request)
    expire_days = (
        settings.REFRESH_TOKEN_EXPIRE_DAYS if payload.remember_me else 7
    )
    session_expiry = datetime.now(timezone.utc) + timedelta(days=expire_days)

    # 4. Record active session
    user_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        refresh_token=refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
        is_active=True,
        expires_at=session_expiry,
    )
    db.add(user_session)
    db.commit()

    # 5. Set HttpOnly cookies on response & client display cookie
    user_display = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "status": user.status.value,
        "mobile_number": user.mobile_number,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=payload.remember_me,
        user_display=user_display,
    )

    return AuthResponse(
        message="Signed in successfully.",
        user=UserResponse.model_validate(user),
        token_type="Bearer",
        access_token=access_token,
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    summary="Refresh Session Tokens",
    description="Generate fresh access and refresh tokens using HttpOnly refresh cookie or payload.",
)
def refresh_token_endpoint(
    request: Request,
    response: Response,
    payload: Optional[TokenRefreshRequest] = None,
    db: OrmSession = Depends(get_db),
):
    # 1. Retrieve refresh token from HttpOnly cookie or request body
    refresh_token = request.cookies.get(settings.COOKIE_NAME_REFRESH)
    if not refresh_token and payload and payload.refresh_token:
        refresh_token = payload.refresh_token

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session refresh token missing. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Decode refresh JWT
    token_data = decode_token(refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Locate active session in database
    now_utc = datetime.now(timezone.utc)
    session_record = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token == refresh_token,
            UserSession.is_active == True,
            UserSession.expires_at > now_utc,
        )
        .first()
    )

    if not session_record:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Active session expired or revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Verify user exists and is active
    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user or user.status != UserStatus.ACTIVE:
        session_record.is_active = False
        db.commit()
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or blocked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 5. Rotate tokens
    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    session_record.refresh_token = new_refresh_token
    session_record.expires_at = now_utc + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    db.commit()

    # 6. Set updated HttpOnly cookies & client display cookie
    user_display = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "status": user.status.value,
        "mobile_number": user.mobile_number,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    set_auth_cookies(
        response=response,
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user_display=user_display,
    )

    return TokenRefreshResponse(
        message="Tokens refreshed successfully.",
        token_type="Bearer",
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="User Logout",
    description="Revoke the active session and clear HttpOnly authentication cookies.",
)
def logout(
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    # 1. Invalidate session in DB if refresh token cookie is present
    refresh_token = request.cookies.get(settings.COOKIE_NAME_REFRESH)
    if refresh_token:
        db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token
        ).update({"is_active": False})
        db.commit()
    else:
        # Check access token
        access_token = get_token_from_request(request)
        if access_token:
            payload = decode_token(access_token)
            if payload and payload.get("sub"):
                client_ip, _ = _extract_client_info(request)
                query = db.query(UserSession).filter(
                    UserSession.user_id == payload.get("sub"),
                    UserSession.is_active == True,
                )
                if client_ip:
                    query = query.filter(UserSession.ip_address == client_ip)
                query.update({"is_active": False})
                db.commit()

    # 2. Instruct browser to remove cookies
    clear_auth_cookies(response)

    return MessageResponse(
        message="Signed out successfully. Session invalidated.",
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Authenticated User Profile",
    description="Retrieve current user details from authenticated HttpOnly cookie.",
)
@require_auth
def get_me():
    pass


@router.get(
    "/sessions",
    response_model=List[UserSessionResponse],
    summary="List Authenticated User Sessions",
    description="Retrieve active and recent login sessions for the current authenticated user.",
)
@require_auth
def get_user_sessions(
    db: OrmSession = Depends(get_db),
):
    user = current_user()
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id)
        .order_by(UserSession.created_at.desc())
        .limit(20)
        .all()
    )
    return [UserSessionResponse.model_validate(s) for s in sessions]
