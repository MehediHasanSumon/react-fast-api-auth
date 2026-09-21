from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full name of user")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (at least 6 characters)")
    mobile_number: Optional[str] = Field(None, max_length=20, description="Contact phone number")
    avatar: Optional[str] = Field(None, description="Profile image URL")


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, description="Registered email address or mobile number")
    password: str = Field(..., min_length=1, description="Account password")
    remember_me: bool = Field(default=False, description="Extend session duration")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered account email address")


class VerifyResetTokenRequest(BaseModel):
    email: EmailStr = Field(..., description="Account email address")
    token_or_otp: str = Field(..., min_length=1, description="6-digit OTP code or reset token")


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Account email address")
    token_or_otp: str = Field(..., min_length=1, description="6-digit OTP code or reset token")
    password: str = Field(..., min_length=8, max_length=128, description="New password (at least 8 characters)")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password (at least 8 characters)")
    confirm_new_password: str = Field(..., min_length=8, max_length=128, description="Confirm new password")


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    mobile_number: Optional[str] = Field(None, max_length=20, description="Mobile contact number")


class AvatarUploadResponse(BaseModel):
    message: str
    avatar_url: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    mobile_number: Optional[str] = None
    avatar: Optional[str] = None
    is_verified: bool
    status: str
    role: Optional[str] = "User"
    department: Optional[str] = "General"
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("roles", mode="before")
    @classmethod
    def serialize_roles(cls, v):
        if not v:
            return []
        return [r.name if hasattr(r, "name") else str(r) for r in v]

    @field_validator("permissions", mode="before")
    @classmethod
    def serialize_permissions(cls, v):
        if not v:
            return []
        return [p.name if hasattr(p, "name") else str(p) for p in v]

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, "role_names_list") and hasattr(obj, "all_permissions_list"):
            # Ensure roles and permissions are pre-populated when validating from ORM model
            res = super().model_validate(obj, *args, **kwargs)
            res.roles = obj.role_names_list
            res.permissions = obj.all_permissions_list
            return res
        return super().model_validate(obj, *args, **kwargs)


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    token_type: str = "Bearer"
    access_token: Optional[str] = None


class TokenRefreshRequest(BaseModel):
    refresh_token: Optional[str] = Field(None, description="Optional if passed via HttpOnly cookie")


class TokenRefreshResponse(BaseModel):
    message: str = "Token refreshed successfully"
    token_type: str = "Bearer"
    access_token: str
    refresh_token: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class UserSessionResponse(BaseModel):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool
    expires_at: datetime
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
