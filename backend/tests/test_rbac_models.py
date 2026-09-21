import uuid
import pytest
from sqlalchemy.orm import Session
from app.models.user import User, UserStatus
from app.models.rbac import Role, Permission, model_has_roles, role_has_permissions, model_has_permissions


def test_role_and_permission_creation(db_session: Session):
    """Verify creating roles and permissions with guard_name and unique constraints."""
    uid = uuid.uuid4().hex[:6]
    role_name = f"admin_{uid}"
    perm1_name = f"users.create_{uid}"
    perm2_name = f"users.view_{uid}"

    role_admin = Role(name=role_name, guard_name="web", description="Full system administrator")
    perm_create_user = Permission(name=perm1_name, guard_name="web", description="Create new users")
    perm_view_user = Permission(name=perm2_name, guard_name="web", description="View users")

    db_session.add_all([role_admin, perm_create_user, perm_view_user])
    db_session.commit()

    assert role_admin.id is not None
    assert perm_create_user.id is not None
    assert perm_view_user.id is not None

    # Role has permissions
    role_admin.give_permission_to(perm_create_user, perm_view_user)
    db_session.commit()

    assert role_admin.has_permission_to(perm1_name) is True
    assert role_admin.has_permission_to(perm2_name) is True
    assert role_admin.has_permission_to("users.delete_nonexistent") is False
    assert role_admin.get_permission_names() == {perm1_name, perm2_name}


def test_user_multiple_roles_and_inherited_permissions(db_session: Session):
    """
    Verify:
    1. A single user can have multiple roles (e.g. Manager + Team Lead).
    2. A role can have multiple permissions.
    3. User inherits permissions from all assigned roles (Laravel Spatie style).
    """
    # 1. Create permissions
    perm_reports_view = Permission(name="reports.view_test", guard_name="web")
    perm_reports_export = Permission(name="reports.export_test", guard_name="web")
    perm_settings_edit = Permission(name="settings.edit_test", guard_name="web")
    db_session.add_all([perm_reports_view, perm_reports_export, perm_settings_edit])
    db_session.commit()

    # 2. Create roles and assign permissions to roles
    role_manager = Role(name="manager_test", guard_name="web")
    role_manager.give_permission_to(perm_reports_view, perm_reports_export)

    role_lead = Role(name="lead_test", guard_name="web")
    role_lead.give_permission_to(perm_settings_edit)

    db_session.add_all([role_manager, role_lead])
    db_session.commit()

    # 3. Create a user
    user = User(
        name="Multi Role User",
        email=f"multi_{uuid.uuid4().hex[:8]}@example.com",
        password="hashed_password",
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    # 4. User can have multiple roles
    user.assign_role(role_manager, role_lead)
    db_session.commit()

    # Verify multiple roles on user
    assert user.has_role("manager_test") is True
    assert user.has_role("lead_test") is True
    assert user.has_role("admin_test") is False
    assert user.has_any_role("admin_test", "manager_test") is True
    assert user.has_all_roles("manager_test", "lead_test") is True
    assert set(user.get_role_names()) == {"manager_test", "lead_test"}

    # Verify user inherits permissions from both roles
    assert user.has_permission_to("reports.view_test") is True
    assert user.has_permission_to("reports.export_test") is True
    assert user.has_permission_to("settings.edit_test") is True
    assert user.has_permission_to("nonexistent.perm") is False

    # Check combined permissions
    all_perms = user.get_all_permissions()
    assert all_perms == {"reports.view_test", "reports.export_test", "settings.edit_test"}


def test_user_direct_permissions_and_sync(db_session: Session):
    """Verify direct user permissions and synchronization (Spatie style)."""
    perm_special = Permission(name="audit.emergency_override", guard_name="web")
    db_session.add(perm_special)
    db_session.commit()

    user = User(
        name="Emergency Officer",
        email=f"officer_{uuid.uuid4().hex[:8]}@example.com",
        password="hashed_password",
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    # Assign direct permission
    user.give_permission_to(perm_special)
    db_session.commit()

    assert user.has_direct_permission("audit.emergency_override") is True
    assert user.has_permission_to("audit.emergency_override") is True

    # Revoke direct permission
    user.revoke_permission_to(perm_special)
    db_session.commit()
    assert user.has_direct_permission("audit.emergency_override") is False
    assert user.has_permission_to("audit.emergency_override") is False
