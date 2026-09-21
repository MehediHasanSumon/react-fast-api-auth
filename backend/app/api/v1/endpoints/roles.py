import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, check_permission
from app.models.rbac import Role, Permission, role_has_permissions, model_has_roles
from app.schemas.rbac import (
    PermissionResponse,
    RoleCreate,
    RoleDetailResponse,
    RoleItemResponse,
    RoleListResponse,
    RoleUpdate,
    SyncRolePermissionsRequest,
    BulkDeleteRolesRequest,
)

router = APIRouter()

# Protected system roles that cannot be deleted or renamed
PROTECTED_ROLES = {"super admin", "admin"}


@router.get("", response_model=RoleListResponse, include_in_schema=False)
@router.get("/", response_model=RoleListResponse, summary="List Roles with Search and Pagination")
def list_roles(
    search: Optional[str] = Query(None, description="Search by role name or description"),
    sort_by: Optional[str] = Query("name_asc", description="Sorting criteria (name_asc, name_desc, newest, oldest)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.view")),
):
    """
    Retrieve paginated roles with user count and permission count.
    Requires 'roles.view' permission.
    """
    query = db.query(Role)

    # 1. Search Filter
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Role.name.ilike(term),
                Role.description.ilike(term),
            )
        )

    total = query.with_entities(func.count(Role.id)).scalar() or 0

    # 2. Sorting
    if sort_by == "name_desc":
        query = query.order_by(Role.name.desc())
    elif sort_by == "newest":
        query = query.order_by(Role.created_at.desc())
    elif sort_by == "oldest":
        query = query.order_by(Role.created_at.asc())
    else:  # name_asc (default)
        query = query.order_by(Role.name.asc())

    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit
    roles = query.offset(offset).limit(limit).all()

    # Calculate user count and permission count per role
    role_items: List[RoleItemResponse] = []
    for r in roles:
        u_count = len(r.users)
        p_count = len(r.permissions)
        item = RoleItemResponse(
            id=r.id,
            name=r.name,
            guard_name=r.guard_name,
            description=r.description,
            user_count=u_count,
            permission_count=p_count,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        role_items.append(item)

    return RoleListResponse(
        roles=role_items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=RoleDetailResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post(
    "/",
    response_model=RoleDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Role",
)
def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.create")),
):
    """
    Create a new role with optional initial permissions list.
    Requires 'roles.create' permission.
    """
    clean_name = role_in.name.strip()
    clean_guard = role_in.guard_name.strip().lower()

    existing = db.query(Role).filter(
        func.lower(Role.name) == clean_name.lower(),
        Role.guard_name == clean_guard,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{clean_name}' for guard '{clean_guard}' already exists.",
        )

    role = Role(
        name=clean_name,
        guard_name=clean_guard,
        description=role_in.description.strip() if role_in.description else None,
    )

    # Attach initial permissions if provided
    if role_in.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = perms

    db.add(role)
    db.commit()
    db.refresh(role)

    return RoleDetailResponse(
        id=role.id,
        name=role.name,
        guard_name=role.guard_name,
        description=role.description,
        user_count=0,
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.get("/{role_id}", response_model=RoleDetailResponse, summary="Get Role by ID with Permissions")
def get_role(
    role_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.view")),
):
    """Retrieve full role details including all assigned permissions."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found.",
        )

    return RoleDetailResponse(
        id=role.id,
        name=role.name,
        guard_name=role.guard_name,
        description=role.description,
        user_count=len(role.users),
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.put("/{role_id}", response_model=RoleDetailResponse, summary="Update Role and Sync Permissions")
def update_role(
    role_id: str,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.edit")),
):
    """
    Update role name, description, and synchronize assigned permissions.
    Requires 'roles.edit' permission.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found.",
        )

    if role_in.name:
        clean_name = role_in.name.strip()
        guard = role_in.guard_name.strip().lower() if role_in.guard_name else role.guard_name
        conflict = db.query(Role).filter(
            func.lower(Role.name) == clean_name.lower(),
            Role.guard_name == guard,
            Role.id != role_id,
        ).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another role named '{clean_name}' already exists.",
            )
        # Prevent renaming protected roles
        if role.name.lower() in PROTECTED_ROLES and clean_name.lower() != role.name.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot rename system protected role '{role.name}'.",
            )
        role.name = clean_name

    if role_in.guard_name:
        role.guard_name = role_in.guard_name.strip().lower()
    if role_in.description is not None:
        role.description = role_in.description.strip() if role_in.description else None

    # Sync permissions if provided
    if role_in.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.sync_permissions(perms)

    db.commit()
    db.refresh(role)

    return RoleDetailResponse(
        id=role.id,
        name=role.name,
        guard_name=role.guard_name,
        description=role.description,
        user_count=len(role.users),
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.post("/{role_id}/permissions", response_model=RoleDetailResponse, summary="Sync Permissions to Role")
def sync_role_permissions(
    role_id: str,
    payload: SyncRolePermissionsRequest,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.edit")),
):
    """Directly synchronize permissions assigned to a role."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found.",
        )

    perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
    role.sync_permissions(perms)
    db.commit()
    db.refresh(role)

    return RoleDetailResponse(
        id=role.id,
        name=role.name,
        guard_name=role.guard_name,
        description=role.description,
        user_count=len(role.users),
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.post("/bulk-delete", summary="Bulk Delete Roles")
def bulk_delete_roles(
    payload: BulkDeleteRolesRequest,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.delete")),
):
    """
    Bulk delete roles by IDs.
    System protected roles ('super admin', 'admin') cannot be deleted.
    """
    if not payload.role_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No role IDs provided for deletion.",
        )

    roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
    if not roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching roles found to delete.",
        )

    for r in roles:
        if r.name.lower() in PROTECTED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"System role '{r.name}' is protected and cannot be deleted.",
            )

    count = 0
    for r in roles:
        db.delete(r)
        count += 1

    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted {count} role(s).",
        "deleted_count": count,
    }


@router.delete("/{role_id}", summary="Delete Role")
def delete_role(
    role_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("roles.delete")),
):
    """
    Delete custom role. System protected roles (Super Admin, admin) cannot be deleted.
    Requires 'roles.delete' permission.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found.",
        )

    if role.name.lower() in PROTECTED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"System role '{role.name}' is protected and cannot be deleted.",
        )

    db.delete(role)
    db.commit()
    return {"message": f"Role '{role.name}' deleted successfully."}
