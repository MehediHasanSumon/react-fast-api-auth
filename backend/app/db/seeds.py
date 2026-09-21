import uuid
from app.db.session import SessionLocal
from app.models.user import User, UserStatus
from app.models.rbac import Role, Permission


def run_seeds():
    """
    Seed initial users, roles, and permissions matching the Laravel Spatie RBAC schema.
    """
    db = SessionLocal()
    try:
        print("\033[1;33m[SEED]\033[0m Seeding permissions, roles, and initial users...")

        # ----------------------------------------------------------------------
        # 1. System Permissions Matrix
        # ----------------------------------------------------------------------
        permissions_data = [
            # Users module
            {"name": "users.view", "description": "View user accounts and profiles"},
            {"name": "users.create", "description": "Register and create new users"},
            {"name": "users.edit", "description": "Update user accounts and credentials"},
            {"name": "users.delete", "description": "Delete user accounts"},
            # Roles module
            {"name": "roles.view", "description": "View system roles and permissions"},
            {"name": "roles.create", "description": "Create new custom roles"},
            {"name": "roles.edit", "description": "Modify roles and assign permissions"},
            {"name": "roles.delete", "description": "Delete custom roles"},
            # Permissions module
            {"name": "permissions.view", "description": "View permissions registry"},
            {"name": "permissions.create", "description": "Create new permissions"},
            {"name": "permissions.edit", "description": "Update permissions"},
            {"name": "permissions.delete", "description": "Delete custom permissions"},
            # Settings module
            {"name": "settings.view", "description": "View system settings and configurations"},
            {"name": "settings.edit", "description": "Update system settings and configurations"},
            # Reports & Analytics
            {"name": "reports.view", "description": "View reports and usage analytics"},
            {"name": "reports.export", "description": "Export reports and system data"},
            # Audit logs
            {"name": "audit.view", "description": "View system audit and activity logs"},
        ]

        created_perms = {}
        for p_data in permissions_data:
            perm = db.query(Permission).filter(
                Permission.name == p_data["name"],
                Permission.guard_name == "web",
            ).first()
            if not perm:
                perm = Permission(
                    name=p_data["name"],
                    guard_name="web",
                    description=p_data["description"],
                )
                db.add(perm)
                db.flush()
            else:
                perm.description = p_data["description"]
            created_perms[p_data["name"]] = perm

        # ----------------------------------------------------------------------
        # 2. System Default Roles & Permission Assignment
        # ----------------------------------------------------------------------
        roles_matrix = {
            "Super Admin": {
                "description": "Full access to all system modules and administration",
                "permissions": list(created_perms.keys()),  # ALL permissions
            },
            "Manager": {
                "description": "Manage user accounts, view roles and system reports",
                "permissions": [
                    "users.view", "users.create", "users.edit",
                    "roles.view",
                    "permissions.view",
                    "reports.view",
                    "reports.export",
                ],
            },
            "Staff": {
                "description": "General system operator with view and reporting permissions",
                "permissions": [
                    "users.view",
                    "reports.view",
                ],
            },
        }

        created_roles = {}
        for role_name, r_meta in roles_matrix.items():
            role = db.query(Role).filter(
                Role.name == role_name,
                Role.guard_name == "web",
            ).first()
            if not role:
                role = Role(
                    name=role_name,
                    guard_name="web",
                    description=r_meta["description"],
                )
                db.add(role)
                db.flush()
            else:
                role.description = r_meta["description"]

            # Sync permissions to role
            role_perm_objs = [created_perms[p] for p in r_meta["permissions"] if p in created_perms]
            role.sync_permissions(role_perm_objs)
            created_roles[role_name] = role

        # ----------------------------------------------------------------------
        # 3. Default Users & Role Linking
        # ----------------------------------------------------------------------
        sample_users = [
            {
                "email": "admin@example.com",
                "name": "System Administrator",
                "mobile_number": "01711223344",
                "avatar": None,
                "password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
                "is_verified": True,
                "status": "active",
                "role": "Super Admin",
                "roles": ["Super Admin"],
            },
            {
                "email": "staff@example.com",
                "name": "Staff User",
                "mobile_number": "01811223344",
                "avatar": None,
                "password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
                "is_verified": True,
                "status": "active",
                "role": "Manager",
                "roles": ["Manager", "Staff"],
            },
        ]

        for u_data in sample_users:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                user = User(
                    id=str(uuid.uuid4()),
                    name=u_data["name"],
                    email=u_data["email"],
                    mobile_number=u_data["mobile_number"],
                    avatar=u_data["avatar"],
                    password=u_data["password"],
                    is_verified=u_data["is_verified"],
                    status=u_data["status"],
                    role=u_data["role"],
                )
                db.add(user)
                db.flush()
                print(f"  \033[1;32m✓\033[0m Created user: {u_data['email']} ({u_data['name']})")
            else:
                user.name = u_data["name"]
                user.role = u_data["role"]
                print(f"  \033[0;90m• User {u_data['email']} exists. Updating roles.\033[0m")

            # Assign roles to user
            user_roles_list = [created_roles[r] for r in u_data["roles"] if r in created_roles]
            user.sync_roles(user_roles_list)

        db.commit()
        print("\033[1;32m[SUCCESS]\033[0m Permissions, roles, and users seeded successfully!\n")
    except Exception as e:
        db.rollback()
        print(f"\033[1;31m[ERROR]\033[0m Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seeds()
