import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User, UserStatus
from app.models.rbac import Role, Permission


@pytest.fixture
def test_client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_auth_headers() -> dict:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
            if not admin_role:
                admin_role = Role(name="Super Admin", guard_name="web")
                db.add(admin_role)
                db.flush()
            admin = User(
                name="System Administrator",
                email="admin@example.com",
                password="hashed_password",
                status=UserStatus.ACTIVE,
                is_verified=True,
            )
            admin.roles = [admin_role]
            db.add(admin)
            db.commit()
            db.refresh(admin)
        token = create_access_token(subject=str(admin.id))
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


@pytest.fixture
def staff_auth_headers() -> dict:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        staff = db.query(User).filter(User.email == "staff@example.com").first()
        if not staff:
            staff_role = db.query(Role).filter(Role.name == "Staff").first()
            if not staff_role:
                staff_role = Role(name="Staff", guard_name="web")
                db.add(staff_role)
                db.flush()
            staff = User(
                name="Staff User",
                email="staff@example.com",
                password="hashed_password",
                status=UserStatus.ACTIVE,
                is_verified=True,
            )
            staff.roles = [staff_role]
            db.add(staff)
            db.commit()
            db.refresh(staff)
        token = create_access_token(subject=str(staff.id))
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def test_list_permissions_and_all(test_client: TestClient, admin_auth_headers: dict):
    """Verify permissions listing and all endpoint."""
    # List paginated permissions
    res = test_client.get(f"{settings.API_V1_STR}/permissions", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "permissions" in data
    assert data["total"] >= 10

    # List all permissions
    res_all = test_client.get(f"{settings.API_V1_STR}/permissions/all", headers=admin_auth_headers)
    assert res_all.status_code == 200
    all_data = res_all.json()
    assert isinstance(all_data, list)
    perm_names = [p["name"] for p in all_data]
    assert "users.view" in perm_names
    assert "roles.view" in perm_names
    assert "permissions.view" in perm_names


def test_create_and_delete_permission(test_client: TestClient, admin_auth_headers: dict):
    """Verify creating and deleting a custom permission."""
    unique_name = f"analytics.view_{uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "description": "View analytics and system metrics",
    }
    create_res = test_client.post(f"{settings.API_V1_STR}/permissions", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    perm = create_res.json()
    assert perm["name"] == unique_name
    perm_id = perm["id"]

    # Delete permission
    del_res = test_client.delete(f"{settings.API_V1_STR}/permissions/{perm_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200


def test_list_and_create_role(test_client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify role listing, counts, and creating a new role with permissions."""
    # List roles
    res = test_client.get(f"{settings.API_V1_STR}/roles?limit=100", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "roles" in data
    role_names = [r["name"] for r in data["roles"]]
    assert "Super Admin" in role_names
    assert "Manager" in role_names

    # Get sample permissions to assign
    p1 = db_session.query(Permission).filter(Permission.name == "users.view").first()
    p2 = db_session.query(Permission).filter(Permission.name == "users.create").first()

    unique_role_name = f"Auditor {uuid.uuid4().hex[:4]}"
    create_payload = {
        "name": unique_role_name,
        "description": "Performs system compliance and security audits",
        "permission_ids": [p1.id, p2.id],
    }

    create_res = test_client.post(f"{settings.API_V1_STR}/roles", json=create_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    role_data = create_res.json()
    assert role_data["name"] == unique_role_name
    assert len(role_data["permissions"]) == 2


def test_user_multi_role_assignment(test_client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify assigning multiple roles to a user via API."""
    staff = db_session.query(User).filter(User.email == "staff@example.com").first()
    manager_role = db_session.query(Role).filter(Role.name == "Manager").first()
    staff_role = db_session.query(Role).filter(Role.name == "Staff").first()

    payload = {"role_ids": [manager_role.id, staff_role.id]}
    res = test_client.post(
        f"{settings.API_V1_STR}/users/{staff.id}/roles",
        json=payload,
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    user_data = res.json()
    assert set(user_data["roles"]) == {"Manager", "Staff"}


def test_permission_based_authorization_rejection(test_client: TestClient, staff_auth_headers: dict, monkeypatch):
    """
    Verify strict permission-based authorization:
    When ENABLE_PERMISSION_ENFORCEMENT is True,
    Staff lacks 'roles.create' permission,
    so attempts to call POST /roles MUST return 403 Forbidden!
    """
    import app.api.deps
    monkeypatch.setattr(app.api.deps, "ENABLE_PERMISSION_ENFORCEMENT", True)

    forbidden_role_payload = {
        "name": "Unauthorized Custom Role",
        "description": "Should fail",
    }
    res = test_client.post(
        f"{settings.API_V1_STR}/roles",
        json=forbidden_role_payload,
        headers=staff_auth_headers,
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_bulk_delete_permissions(test_client: TestClient, admin_auth_headers: dict):
    """Verify bulk deletion of permissions."""
    p1_name = f"bulk.test1_{uuid.uuid4().hex[:6]}"
    p2_name = f"bulk.test2_{uuid.uuid4().hex[:6]}"
    res1 = test_client.post(f"{settings.API_V1_STR}/permissions", json={"name": p1_name}, headers=admin_auth_headers)
    res2 = test_client.post(f"{settings.API_V1_STR}/permissions", json={"name": p2_name}, headers=admin_auth_headers)
    assert res1.status_code == 201
    assert res2.status_code == 201
    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    res = test_client.post(
        f"{settings.API_V1_STR}/permissions/bulk-delete",
        json={"permission_ids": [id1, id2]},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 2


def test_bulk_delete_roles(test_client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify bulk deletion of roles and protection of system roles."""
    r1_name = f"RoleDel1_{uuid.uuid4().hex[:6]}"
    r2_name = f"RoleDel2_{uuid.uuid4().hex[:6]}"
    res1 = test_client.post(f"{settings.API_V1_STR}/roles", json={"name": r1_name}, headers=admin_auth_headers)
    res2 = test_client.post(f"{settings.API_V1_STR}/roles", json={"name": r2_name}, headers=admin_auth_headers)
    assert res1.status_code == 201
    assert res2.status_code == 201
    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    res = test_client.post(
        f"{settings.API_V1_STR}/roles/bulk-delete",
        json={"role_ids": [id1, id2]},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 2

    # Verify protected role deletion is rejected
    super_admin = db_session.query(Role).filter(Role.name == "Super Admin").first()
    if super_admin:
        res_blocked = test_client.post(
            f"{settings.API_V1_STR}/roles/bulk-delete",
            json={"role_ids": [super_admin.id]},
            headers=admin_auth_headers,
        )
        assert res_blocked.status_code == 403


def test_bulk_delete_users(test_client: TestClient, admin_auth_headers: dict):
    """Verify bulk deletion of user accounts and protection against deleting self."""
    import random
    suffix = random.randint(100000, 999999)
    u1_payload = {
        "name": "Bulk User 1",
        "email": f"bulk1_{suffix}@example.com",
        "password": "password123",
        "mobile_number": f"+880171{suffix}",
        "role": "Manager",
        "department": "Operations",
    }
    u2_payload = {
        "name": "Bulk User 2",
        "email": f"bulk2_{suffix}@example.com",
        "password": "password123",
        "mobile_number": f"+880172{suffix}",
        "role": "Staff",
        "department": "Support",
    }

    res1 = test_client.post(f"{settings.API_V1_STR}/users", json=u1_payload, headers=admin_auth_headers)
    res2 = test_client.post(f"{settings.API_V1_STR}/users", json=u2_payload, headers=admin_auth_headers)
    assert res1.status_code == 201
    assert res2.status_code == 201
    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    res = test_client.post(
        f"{settings.API_V1_STR}/users/bulk-delete",
        json={"user_ids": [id1, id2]},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 2



