import os
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session as OrmSession
from PIL import Image, ImageOps

import hmac
from app.api.deps import get_current_user, get_db, get_token_from_request
from app.core.config import settings
from app.core.decorators import current_user, require_auth
from app.core.ratelimit import (
    login_limiter,
    forgot_password_limiter,
    verify_otp_limiter,
    reset_password_limiter,
)
from app.core.security import (
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_opaque_token,
    hash_password,
    hash_secret_token,
    verify_secret_token,
    set_auth_cookies,
    set_user_display_cookie,
    verify_password,
)
from app.models.session import Session as UserSession
from app.models.user import User, UserStatus
from app.models.password_reset import PasswordReset
from app.services.email import send_password_reset_email
from app.schemas.auth import (
    AuthResponse,
    AvatarUploadResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UpdateProfileRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserSessionResponse,
    VerifyResetTokenRequest,
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
    dependencies=[Depends(login_limiter)],
)
def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    now_utc = datetime.now(timezone.utc)

    # 1. Fetch user by email or mobile number
    ident = payload.email.strip()
    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.email) == ident.lower(),
                User.mobile_number == ident,
            )
        )
        .first()
    )

    # If user exists, check lockout status
    if user and user.locked_until:
        locked_until_utc = (
            user.locked_until
            if user.locked_until.tzinfo
            else user.locked_until.replace(tzinfo=timezone.utc)
        )
        if locked_until_utc > now_utc:
            remaining_seconds = int((locked_until_utc - now_utc).total_seconds())
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked due to multiple failed login attempts. Please try again in {remaining_minutes} minute(s) or reset your password.",
                headers={"Retry-After": str(remaining_seconds)},
            )
        else:
            # Lockout period elapsed, reset
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()

    if not user or not verify_password(payload.password, user.password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                user.locked_until = now_utc + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Account has been locked due to {settings.MAX_FAILED_LOGIN_ATTEMPTS} consecutive failed login attempts. Please try again after {settings.ACCOUNT_LOCKOUT_MINUTES} minutes or reset your password.",
                )
            db.commit()
            remaining = settings.MAX_FAILED_LOGIN_ATTEMPTS - user.failed_login_attempts
            warning = f" {remaining} attempt(s) remaining before account lockout." if remaining > 0 else ""
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid email/mobile number or password.{warning}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/mobile number or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Reset failed attempts upon successful password verification
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

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
        "avatar": user.avatar,
        "status": user.status.value,
        "mobile_number": user.mobile_number,
        "is_verified": user.is_verified,
        "roles": user.role_names_list,
        "permissions": user.all_permissions_list,
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
    "/checkauthuser",
    response_model=UserResponse,
    summary="Check Authenticated User Profile",
    description="Verify active user session and return fresh user details.",
)
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Authenticated User Profile",
    description="Retrieve current user details from authenticated HttpOnly cookie.",
)
@require_auth
def get_me():
    return current_user()


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


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request Password Reset",
    description="Generate a secure 6-digit OTP code and direct reset link and send via email.",
    dependencies=[Depends(forgot_password_limiter)],
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: OrmSession = Depends(get_db),
):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()

    # Always return standard generic response to prevent account enumeration
    if not user:
        return MessageResponse(
            message="If an account with that email exists, password reset instructions have been sent to your inbox."
        )

    # Generate 6-digit OTP code and secure reset token
    otp = f"{secrets.randbelow(900000) + 100000}"
    reset_token = secrets.token_urlsafe(32)
    otp_hash = hash_secret_token(otp)
    token_hash = hash_secret_token(reset_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Invalidate prior unredeemed resets for this user
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.is_used == False,
    ).update({"is_used": True})

    # Store cryptographic SHA-256 hashes only (no plaintext secrets in DB)
    reset_record = PasswordReset(
        user_id=user.id,
        email=user.email,
        token_hash=token_hash,
        otp_hash=otp_hash,
        token=None,
        otp=None,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(reset_record)
    db.commit()

    # Dispatch email with plain OTP and Reset Link to user
    send_password_reset_email(
        to_email=user.email,
        user_name=user.name,
        otp=otp,
        reset_token=reset_token,
    )

    return MessageResponse(
        message="If an account with that email exists, password reset instructions have been sent to your inbox."
    )


@router.post(
    "/verify-reset-token",
    response_model=MessageResponse,
    summary="Verify Reset OTP or Token",
    description="Verify if a password reset token or 6-digit OTP is valid and unexpired.",
    dependencies=[Depends(verify_otp_limiter)],
)
def verify_reset_token(
    payload: VerifyResetTokenRequest,
    db: OrmSession = Depends(get_db),
):
    email_clean = payload.email.lower().strip()
    code = payload.token_or_otp.strip()
    code_hash = hash_secret_token(code)
    now_utc = datetime.now(timezone.utc)

    reset_record = (
        db.query(PasswordReset)
        .filter(
            func.lower(PasswordReset.email) == email_clean,
            PasswordReset.is_used == False,
            PasswordReset.expires_at > now_utc,
            or_(
                PasswordReset.token_hash == code_hash,
                PasswordReset.otp_hash == code_hash,
                PasswordReset.token == code,
                PasswordReset.otp == code,
            ),
        )
        .first()
    )
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code / link. Please request a new one.",
        )
    return MessageResponse(message="Reset code is valid.")


@router.post(
    "/reset-password",
    response_model=AuthResponse,
    summary="Reset Password and Authenticate User",
    description="Update password using verified OTP or token, invalidate prior sessions, create fresh session and cookies.",
    dependencies=[Depends(reset_password_limiter)],
)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    email_clean = payload.email.lower().strip()
    code = payload.token_or_otp.strip()
    code_hash = hash_secret_token(code)
    now_utc = datetime.now(timezone.utc)

    reset_record = (
        db.query(PasswordReset)
        .filter(
            func.lower(PasswordReset.email) == email_clean,
            PasswordReset.is_used == False,
            PasswordReset.expires_at > now_utc,
            or_(
                PasswordReset.token_hash == code_hash,
                PasswordReset.otp_hash == code_hash,
                PasswordReset.token == code,
                PasswordReset.otp == code,
            ),
        )
        .first()
    )
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code / link. Please request a new one.",
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # 1. Update password, clear failed attempts and unlock account, mark token as used
    user.password = hash_password(payload.password)
    user.failed_login_attempts = 0
    user.locked_until = None
    reset_record.is_used = True

    # 2. Invalidate all prior sessions for security
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_active": False})

    # 3. Create fresh authenticated session for automatic login
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    session_token = generate_opaque_token(32)

    client_ip, user_agent = _extract_client_info(request)
    session_expiry = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    new_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        refresh_token=refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
        is_active=True,
        expires_at=session_expiry,
    )
    db.add(new_session)
    db.commit()

    # 4. Set HttpOnly cookies & client display cookie
    user_display = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "status": user.status.value,
        "mobile_number": user.mobile_number,
        "is_verified": user.is_verified,
        "roles": user.role_names_list,
        "permissions": user.all_permissions_list,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=False,
        user_display=user_display,
    )

    return AuthResponse(
        message="Your password has been successfully reset. You are now logged in.",
        user=UserResponse.model_validate(user),
        token_type="Bearer",
        access_token=access_token,
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change Account Password",
    description="Update password for authenticated user after verifying current password.",
)
@require_auth
def change_password(
    payload: ChangePasswordRequest,
    db: OrmSession = Depends(get_db),
):
    user = current_user()
    if not verify_password(payload.current_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )

    if verify_password(payload.new_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password.",
        )

    db_user = db.query(User).filter(User.id == user.id).first()
    db_user.password = hash_password(payload.new_password)
    db.commit()

    return MessageResponse(message="Password updated successfully.")


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update Authenticated User Profile",
    description="Update personal details (name, mobile number) for the authenticated user.",
)
@require_auth
def update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
):
    user = current_user()
    db_user = db.query(User).filter(User.id == user.id).first()

    # Validate mobile uniqueness if changed
    if payload.mobile_number and payload.mobile_number.strip():
        clean_mobile = payload.mobile_number.strip()
        existing = (
            db.query(User)
            .filter(User.mobile_number == clean_mobile, User.id != user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This contact number is already registered to another account.",
            )
        db_user.mobile_number = clean_mobile
    else:
        db_user.mobile_number = None

    db_user.name = payload.name.strip()
    db.commit()
    db.refresh(db_user)

    # Update display cookie
    set_user_display_cookie(response, db_user)

    return UserResponse.model_validate(db_user)


@router.post(
    "/avatar",
    response_model=AvatarUploadResponse,
    summary="Upload Profile Avatar with Pillow",
    description="Securely process, resize to 400x400 square, and optimize avatar using Pillow.",
)
@require_auth
def upload_avatar(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    db: OrmSession = Depends(get_db),
):
    user = current_user()

    # Case-insensitive MIME check with broader image type compatibility
    content_type = (file.content_type or "").lower().strip()
    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/pjpeg",
        "image/png",
        "image/x-png",
        "image/webp",
        "application/octet-stream",
    }
    if content_type and content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only JPEG, PNG, and WebP images are supported.",
        )

    # File size limit (15MB)
    MAX_FILE_SIZE = 15 * 1024 * 1024
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 15MB limit.",
        )

    # Pillow image validation and reading
    try:
        img = Image.open(file.file)
        img.verify()
        if img.format not in ("JPEG", "PNG", "WEBP"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Supported formats are JPEG, PNG, and WebP.",
            )
        file.file.seek(0)
        img = Image.open(file.file)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupt or unreadable image file.",
        )

    # Auto-orient based on EXIF (fixes sideways smartphone photos)
    img = ImageOps.exif_transpose(img)

    # Convert modes
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")

    # Crop and fit into a clean 400x400 square
    img = ImageOps.fit(img, (400, 400), Image.Resampling.LANCZOS)

    # Prepare storage directory
    avatar_dir = os.path.join(settings.uploads_path, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    # Delete old local avatar file if exists
    db_user = db.query(User).filter(User.id == user.id).first()
    if db_user.avatar and db_user.avatar.startswith("/uploads/avatars/"):
        old_filename = os.path.basename(db_user.avatar)
        old_path = os.path.join(avatar_dir, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    # Save new image as WebP
    filename = f"avatar_{user.id}_{int(time.time())}.webp"
    target_path = os.path.join(avatar_dir, filename)
    img.save(target_path, format="WEBP", quality=85, optimize=True)

    # Update database
    relative_url = f"/uploads/avatars/{filename}"
    db_user.avatar = relative_url
    db.commit()
    db.refresh(db_user)

    # Update client display cookie
    set_user_display_cookie(response, db_user)

    return AvatarUploadResponse(
        message="Profile avatar updated successfully.",
        avatar_url=relative_url,
        user=UserResponse.model_validate(db_user),
    )
