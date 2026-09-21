from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserItemResponse(BaseModel):
    id: str
    name: str
    email: str
    mobile_number: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)
    department: str
    status: str
    is_verified: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

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
        res = super().model_validate(obj, *args, **kwargs)
        if hasattr(obj, "role_names_list"):
            res.roles = obj.role_names_list
            if obj.role_names_list:
                res.role = ", ".join(obj.role_names_list)
            elif hasattr(obj, "role") and obj.role and obj.role != "N/A":
                res.role = obj.role
            else:
                res.role = "—"
        if hasattr(obj, "all_permissions_list"):
            res.permissions = obj.all_permissions_list
        return res


class UserListResponse(BaseModel):
    users: List[UserItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class CreateUserByAdminRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Unique user email address")
    password: str = Field(..., min_length=6, max_length=128, description="Initial account password")
    mobile_number: str = Field(..., min_length=7, max_length=20, pattern=r"^[0-9+()\- ]+$", description="Contact phone number")
    role: Optional[str] = Field(default="Doctor", max_length=50, description="Assigned role")
    role_ids: Optional[List[str]] = Field(default=None, description="Optional multiple role IDs to assign")
    department: Optional[str] = Field(default="General Medicine", max_length=100, description="Assigned department")
    status: Optional[str] = Field(default="active", description="Account status: active, deactived, blocked, baned")
    is_verified: Optional[bool] = Field(default=True, description="Account verification status")


class UpdateUserStatusRequest(BaseModel):
    status: str = Field(..., description="Target status: active, deactived, blocked, baned")


class UpdateUserByAdminRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Full name of user")
    email: Optional[EmailStr] = Field(None, description="Unique user email address")
    mobile_number: Optional[str] = Field(None, min_length=7, max_length=20, pattern=r"^[0-9+()\- ]+$", description="Contact phone number")
    password: Optional[str] = Field(None, min_length=6, max_length=128, description="New password if updating")
    status: Optional[str] = Field(None, description="Account status: active, deactived, blocked, baned")
    is_verified: Optional[bool] = Field(None, description="Account verification status")
    role: Optional[str] = Field(None, max_length=50, description="Assigned role")
    role_ids: Optional[List[str]] = Field(None, description="Optional multiple role IDs to assign")
    department: Optional[str] = Field(None, max_length=100, description="Assigned department")


class BulkDeleteUsersRequest(BaseModel):
    user_ids: List[str] = Field(..., min_length=1, description="List of user UUIDs to delete")

