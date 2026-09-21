import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, check_permission
from app.models.rbac import Permission, Role, role_has_permissions
from app.schemas.rbac import (
    PermissionCreate,
    PermissionListResponse,
    PermissionResponse,
    PermissionUpdate,
    BulkDeletePermissionsRequest,
)

router = APIRouter()


@router.get("", response_model=PermissionListResponse, include_in_schema=False)
@router.get("/", response_model=PermissionListResponse, summary="List Permissions with Search and Pagination")
def list_permissions(
    search: Optional[str] = Query(None, description="Search term for name or description"),
    sort_by: Optional[str] = Query("name_asc", description="Sorting criteria (name_asc, name_desc, newest, oldest)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.view")),
):
    """
    Retrieve paginated permissions list with full-text search.
    Requires 'permissions.view' permission.
    """
    query = db.query(Permission)

    # 1. Search Filter
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Permission.name.ilike(term),
                Permission.description.ilike(term),
            )
        )

    total = query.with_entities(func.count(Permission.id)).scalar() or 0

    # 2. Sorting
    if sort_by == "name_desc":
        query = query.order_by(Permission.name.desc())
    elif sort_by == "newest":
        query = query.order_by(Permission.created_at.desc())
    elif sort_by == "oldest":
        query = query.order_by(Permission.created_at.asc())
    else:  # name_asc (default)
        query = query.order_by(Permission.name.asc())

    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit
    permissions = query.offset(offset).limit(limit).all()

    return PermissionListResponse(
        permissions=[PermissionResponse.model_validate(p) for p in permissions],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/all", response_model=List[PermissionResponse], summary="List All Permissions")
def list_all_permissions(
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.view", "roles.create", "roles.edit")),
):
    """
    Retrieve all permissions without pagination, ideal for role assignment forms.
    """
    permissions = db.query(Permission).order_by(Permission.name.asc()).all()
    return [PermissionResponse.model_validate(p) for p in permissions]


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post(
    "/",
    response_model=PermissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Permission",
)
def create_permission(
    perm_in: PermissionCreate,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.create")),
):
    """
    Create a new system permission key.
    Requires 'permissions.create' permission.
    """
    clean_name = perm_in.name.strip().lower()
    clean_guard = perm_in.guard_name.strip().lower()

    existing = db.query(Permission).filter(
        Permission.name == clean_name,
        Permission.guard_name == clean_guard,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Permission '{clean_name}' for guard '{clean_guard}' already exists.",
        )

    permission = Permission(
        name=clean_name,
        guard_name=clean_guard,
        description=perm_in.description.strip() if perm_in.description else None,
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)

    return PermissionResponse.model_validate(permission)


@router.get("/{permission_id}", response_model=PermissionResponse, summary="Get Permission by ID")
def get_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.view")),
):
    """Retrieve single permission record."""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found.",
        )
    return PermissionResponse.model_validate(permission)


@router.put("/{permission_id}", response_model=PermissionResponse, summary="Update Permission")
def update_permission(
    permission_id: str,
    perm_in: PermissionUpdate,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.edit")),
):
    """Update permission details."""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found.",
        )

    if perm_in.name:
        clean_name = perm_in.name.strip().lower()
        guard = perm_in.guard_name.strip().lower() if perm_in.guard_name else permission.guard_name
        conflict = db.query(Permission).filter(
            Permission.name == clean_name,
            Permission.guard_name == guard,
            Permission.id != permission_id,
        ).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another permission with name '{clean_name}' already exists.",
            )
        permission.name = clean_name

    if perm_in.guard_name:
        permission.guard_name = perm_in.guard_name.strip().lower()
    if perm_in.description is not None:
        permission.description = perm_in.description.strip() if perm_in.description else None

    db.commit()
    db.refresh(permission)
    return PermissionResponse.model_validate(permission)


@router.post("/bulk-delete", summary="Bulk Delete Permissions")
def bulk_delete_permissions(
    payload: BulkDeletePermissionsRequest,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.delete")),
):
    """
    Bulk delete permissions by IDs.
    """
    if not payload.permission_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No permission IDs provided for deletion.",
        )

    perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
    if not perms:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching permissions found to delete.",
        )

    count = 0
    for p in perms:
        db.delete(p)
        count += 1

    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted {count} permission(s).",
        "deleted_count": count,
    }


@router.delete("/{permission_id}", summary="Delete Permission")
def delete_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("permissions.delete")),
):
    """Delete permission record."""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found.",
        )

    db.delete(permission)
    db.commit()
    return {"message": f"Permission '{permission.name}' deleted successfully."}
