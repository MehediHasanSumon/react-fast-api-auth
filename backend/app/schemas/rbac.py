from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Permission Schemas
# ==============================================================================

class PermissionBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        pattern=r"^[a-zA-Z0-9_\-.:]+$",
        description="Unique permission key (e.g. users.create, roles.view)",
    )
    guard_name: str = Field(
        default="web",
        min_length=2,
        max_length=50,
        description="Guard boundary (e.g. web, api)",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Human readable description of permission",
    )


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_\-.:]+$")
    guard_name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class PermissionResponse(PermissionBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PermissionListResponse(BaseModel):
    permissions: List[PermissionResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# ==============================================================================
# Role Schemas
# ==============================================================================

class RoleBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Role identifier (e.g. Super Admin, Manager, Editor)",
    )
    guard_name: str = Field(
        default="web",
        min_length=2,
        max_length=50,
        description="Guard boundary (e.g. web, api)",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Role description and summary of access",
    )


class RoleCreate(RoleBase):
    permission_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of permission UUIDs to associate upon creation",
    )


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    guard_name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    permission_ids: Optional[List[str]] = Field(
        None,
        description="Optional full list of permission UUIDs to sync with role",
    )


class RoleItemResponse(RoleBase):
    id: str
    user_count: int = 0
    permission_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoleDetailResponse(RoleBase):
    id: str
    user_count: int = 0
    permissions: List[PermissionResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoleListResponse(BaseModel):
    roles: List[RoleItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# ==============================================================================
# Assignment Request Schemas
# ==============================================================================

class SyncRolePermissionsRequest(BaseModel):
    permission_ids: List[str] = Field(
        ...,
        description="List of permission UUIDs to assign to the role",
    )


class SyncUserRolesRequest(BaseModel):
    role_ids: List[str] = Field(
        ...,
        description="List of role UUIDs to assign to the user",
    )


class SyncUserPermissionsRequest(BaseModel):
    permission_ids: List[str] = Field(
        ...,
        description="List of direct permission UUIDs to assign to the user",
    )


class UserPermissionsResponse(BaseModel):
    user_id: str
    roles: List[RoleItemResponse]
    direct_permissions: List[PermissionResponse]
    effective_permissions: List[str]


class BulkDeleteRolesRequest(BaseModel):
    role_ids: List[str] = Field(..., min_length=1, description="List of role UUIDs to delete")


class BulkDeletePermissionsRequest(BaseModel):
    permission_ids: List[str] = Field(..., min_length=1, description="List of permission UUIDs to delete")
