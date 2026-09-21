import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, check_permission, get_token_from_request
from app.core.security import hash_password, decode_token
from app.models.user import User, UserStatus
from app.models.rbac import Role, Permission
from app.schemas.user import (
    BulkDeleteUsersRequest,
    CreateUserByAdminRequest,
    UpdateUserByAdminRequest,
    UpdateUserStatusRequest,
    UserItemResponse,
    UserListResponse,
)
from app.schemas.rbac import (
    RoleItemResponse,
    PermissionResponse,
    SyncUserRolesRequest,
    SyncUserPermissionsRequest,
    UserPermissionsResponse,
)

router = APIRouter()


@router.get("", response_model=UserListResponse, include_in_schema=False)
@router.get("/", response_model=UserListResponse, summary="List Users with Search and Pagination")
def list_users(
    search: Optional[str] = Query(None, description="Search term for name, email or phone"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by account status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    sort_by: Optional[str] = Query("newest", description="Sorting criteria (newest, oldest, name_asc, name_desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated user accounts with full-text search and faceted filtering.
    Optimized for production: indexed primary key count and indexed sorting.
    """
    filters = []

    # Search filter across indexed name, email, mobile_number
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                User.mobile_number.ilike(term),
            )
        )

    # Status filter
    if status_filter and status_filter.strip() and status_filter.strip().lower() != "all":
        clean_status = status_filter.strip().lower()
        status_map = {
            "active": UserStatus.ACTIVE,
            "deactived": UserStatus.DEACTIVED,
            "deactivated": UserStatus.DEACTIVED,
            "blocked": UserStatus.BLOCKED,
            "baned": UserStatus.BANED,
            "banned": UserStatus.BANED,
        }
        if clean_status in status_map:
            filters.append(User.status == status_map[clean_status])

    # Verification filter
    if is_verified is not None:
        filters.append(User.is_verified == is_verified)

    # Role filter (if provided)
    if role and role.strip() and role.strip().lower() != "all":
        filters.append(User.role.ilike(role.strip()))

    # Department filter (if provided)
    if department and department.strip() and department.strip().lower() != "all":
        filters.append(User.department.ilike(department.strip()))

    # Production-optimized total count using indexed User.id (avoids ORDER BY overhead)
    total_query = db.query(func.count(User.id))
    if filters:
        total_query = total_query.filter(*filters)
    total = total_query.scalar() or 0

    total_pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    # Main data query with indexed ordering
    data_query = db.query(User)
    if filters:
        data_query = data_query.filter(*filters)

    if sort_by == "oldest":
        data_query = data_query.order_by(User.created_at.asc())
    elif sort_by == "name_asc":
        data_query = data_query.order_by(User.name.asc())
    elif sort_by == "name_desc":
        data_query = data_query.order_by(User.name.desc())
    else:  # default newest using indexed ix_users_created_at
        data_query = data_query.order_by(User.created_at.desc())

    users = data_query.offset(offset).limit(limit).all()

    # Build response models
    items = []
    for u in users:
        role_names = u.role_names_list
        if role_names:
            primary_role = ", ".join(role_names)
        elif u.role and u.role != "N/A":
            primary_role = u.role
        else:
            primary_role = "—"

        items.append(
            UserItemResponse(
                id=str(u.id),
                name=u.name,
                email=u.email,
                mobile_number=u.mobile_number,
                avatar=u.avatar,
                role=primary_role,
                roles=role_names,
                permissions=u.all_permissions_list,
                department=u.department or "General",
                status=u.status.value if hasattr(u.status, "value") else str(u.status),
                is_verified=u.is_verified,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
        )

    return UserListResponse(
        users=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=UserItemResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=UserItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User Account",
)
def create_user(
    user_in: CreateUserByAdminRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new user account with role, department, and hashed credentials.
    """
    # Check email uniqueness
    existing_email = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{user_in.email}' already exists.",
        )

    # Check mobile number uniqueness if provided
    if user_in.mobile_number and user_in.mobile_number.strip():
        existing_phone = (
            db.query(User).filter(User.mobile_number == user_in.mobile_number.strip()).first()
        )
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Phone number '{user_in.mobile_number}' is already registered.",
            )

    # Parse status enum
    status_map = {
        "active": UserStatus.ACTIVE,
        "deactived": UserStatus.DEACTIVED,
        "deactivated": UserStatus.DEACTIVED,
        "blocked": UserStatus.BLOCKED,
        "baned": UserStatus.BANED,
        "banned": UserStatus.BANED,
    }
    user_status = status_map.get(
        (user_in.status or "active").strip().lower(), UserStatus.ACTIVE
    )

    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password=hash_password(user_in.password),
        mobile_number=user_in.mobile_number.strip() if user_in.mobile_number else None,
        role=user_in.role.strip() if user_in.role else "Doctor",
        department=user_in.department.strip() if user_in.department else "General Medicine",
        status=user_status,
        is_verified=user_in.is_verified if user_in.is_verified is not None else True,
    )

    if user_in.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        new_user.roles = roles

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserItemResponse.model_validate(new_user)


@router.patch("/{user_id}/status", response_model=UserItemResponse, summary="Update User Status")
def update_user_status(
    user_id: str,
    status_in: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
):
    """
    Toggle or set account status (e.g. active, deactived, blocked, baned).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found.",
        )

    status_map = {
        "active": UserStatus.ACTIVE,
        "deactived": UserStatus.DEACTIVED,
        "deactivated": UserStatus.DEACTIVED,
        "blocked": UserStatus.BLOCKED,
        "baned": UserStatus.BANED,
        "banned": UserStatus.BANED,
    }
    normalized = status_in.status.strip().lower()
    if normalized not in status_map:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{status_in.status}'. Valid values are: active, deactived, blocked, baned.",
        )

    user.status = status_map[normalized]
    db.commit()
    db.refresh(user)

    role_names = user.role_names_list
    if role_names:
        primary_role = ", ".join(role_names)
    elif user.role and user.role != "N/A":
        primary_role = user.role
    else:
        primary_role = "—"

    return UserItemResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        mobile_number=user.mobile_number,
        avatar=user.avatar,
        role=primary_role,
        roles=role_names,
        permissions=user.all_permissions_list,
        department=user.department or "General",
        status=user.status.value if hasattr(user.status, "value") else str(user.status),
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.put("/{user_id}", response_model=UserItemResponse, summary="Update User Account")
def update_user(
    user_id: str,
    user_in: UpdateUserByAdminRequest,
    db: Session = Depends(get_db),
):
    """
    Update a user account's profile, credentials, and access settings.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found.",
        )

    # Check email uniqueness if changing email
    if user_in.email and user_in.email.strip().lower() != user.email.lower():
        existing_email = (
            db.query(User)
            .filter(User.email.ilike(user_in.email.strip()), User.id != user_id)
            .first()
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{user_in.email}' already exists.",
            )
        user.email = user_in.email.strip().lower()

    # Check phone uniqueness if changing mobile number
    if user_in.mobile_number and user_in.mobile_number.strip():
        clean_phone = user_in.mobile_number.strip()
        if clean_phone != (user.mobile_number or ""):
            existing_phone = (
                db.query(User)
                .filter(User.mobile_number == clean_phone, User.id != user_id)
                .first()
            )
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Phone number '{clean_phone}' is already registered to another account.",
                )
        user.mobile_number = clean_phone
    elif user_in.mobile_number is not None and user_in.mobile_number.strip() == "":
        user.mobile_number = None

    if user_in.name and user_in.name.strip():
        user.name = user_in.name.strip()

    if user_in.password and user_in.password.strip():
        user.password = hash_password(user_in.password)

    if user_in.role and user_in.role.strip():
        user.role = user_in.role.strip()

    if user_in.department and user_in.department.strip():
        user.department = user_in.department.strip()

    if user_in.is_verified is not None:
        user.is_verified = user_in.is_verified

    if user_in.status:
        status_map = {
            "active": UserStatus.ACTIVE,
            "deactived": UserStatus.DEACTIVED,
            "deactivated": UserStatus.DEACTIVED,
            "blocked": UserStatus.BLOCKED,
            "baned": UserStatus.BANED,
            "banned": UserStatus.BANED,
        }
        clean_status = user_in.status.strip().lower()
        if clean_status in status_map:
            user.status = status_map[clean_status]

    if user_in.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        user.sync_roles(roles)

    db.commit()
    db.refresh(user)

    return UserItemResponse.model_validate(user)


@router.post("/bulk-delete", summary="Bulk Delete Users")
def bulk_delete_users(
    payload: BulkDeleteUsersRequest,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("users.delete")),
):
    """
    Bulk delete user accounts by IDs.
    Prevents authenticated user from deleting their own account.
    """
    if not payload.user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user IDs provided for deletion.",
        )

    # Protect current authenticated user from deleting themselves
    token = get_token_from_request(request)
    if token:
        try:
            token_data = decode_token(token)
            if token_data and token_data.get("sub"):
                current_id = str(token_data.get("sub"))
                if current_id in payload.user_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot delete your own user account.",
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    users = db.query(User).filter(User.id.in_(payload.user_ids)).all()
    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching users found to delete.",
        )

    count = 0
    for u in users:
        db.delete(u)
        count += 1

    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted {count} user(s).",
        "deleted_count": count,
    }


@router.delete("/{user_id}", summary="Delete User Account")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a user account by ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found.",
        )

    db.delete(user)
    db.commit()

    return {
        "success": True,
        "message": f"User '{user.email}' has been successfully deleted.",
    }


@router.get("/{user_id}/roles", response_model=List[RoleItemResponse], summary="Get User Assigned Roles")
def get_user_roles(
    user_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("users.view", "roles.view")),
):
    """Retrieve all roles assigned to the user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return [
        RoleItemResponse(
            id=r.id,
            name=r.name,
            guard_name=r.guard_name,
            description=r.description,
            user_count=len(r.users),
            permission_count=len(r.permissions),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in user.roles
    ]


@router.post("/{user_id}/roles", response_model=UserItemResponse, summary="Sync Roles to User")
def sync_user_roles(
    user_id: str,
    payload: SyncUserRolesRequest,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("users.edit", "roles.edit")),
):
    """Synchronize multiple roles to user (Spatie-style)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
    user.sync_roles(roles)
    db.commit()
    db.refresh(user)
    return UserItemResponse.model_validate(user)


@router.get("/{user_id}/permissions", response_model=UserPermissionsResponse, summary="Get User Permissions Breakdown")
def get_user_permissions(
    user_id: str,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("users.view", "permissions.view")),
):
    """
    Retrieve user permissions breakdown: assigned roles, direct permissions,
    and effective combined permissions list.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    roles_data = [
        RoleItemResponse(
            id=r.id,
            name=r.name,
            guard_name=r.guard_name,
            description=r.description,
            user_count=len(r.users),
            permission_count=len(r.permissions),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in user.roles
    ]
    direct_perms = [PermissionResponse.model_validate(p) for p in user.permissions]
    effective = user.all_permissions_list

    return UserPermissionsResponse(
        user_id=user.id,
        roles=roles_data,
        direct_permissions=direct_perms,
        effective_permissions=effective,
    )


@router.post("/{user_id}/permissions", response_model=UserPermissionsResponse, summary="Sync Direct Permissions to User")
def sync_user_permissions(
    user_id: str,
    payload: SyncUserPermissionsRequest,
    db: Session = Depends(get_db),
    _user=Depends(check_permission("users.edit", "permissions.edit")),
):
    """Synchronize direct permissions to a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
    user.sync_permissions(perms)
    db.commit()
    db.refresh(user)

    roles_data = [
        RoleItemResponse(
            id=r.id,
            name=r.name,
            guard_name=r.guard_name,
            description=r.description,
            user_count=len(r.users),
            permission_count=len(r.permissions),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in user.roles
    ]
    direct_perms = [PermissionResponse.model_validate(p) for p in user.permissions]
    effective = user.all_permissions_list

    return UserPermissionsResponse(
        user_id=user.id,
        roles=roles_data,
        direct_permissions=direct_perms,
        effective_permissions=effective,
    )

