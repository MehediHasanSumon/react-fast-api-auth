import uuid
from typing import List, Set, Union
from sqlalchemy import Column, String, ForeignKey, Table, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin

# ==============================================================================
# Pivot / Association Tables (Laravel Spatie Permission style)
# ==============================================================================

# Pivot: Role <-> Permission (Many-to-Many)
role_has_permissions = Table(
    "role_has_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True, index=True),
)

# Pivot: User / Model <-> Role (Many-to-Many: user can have multiple roles)
model_has_roles = Table(
    "model_has_roles",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True, index=True),
)

# Pivot: User / Model <-> Permission (Many-to-Many: user can have direct permissions)
model_has_permissions = Table(
    "model_has_permissions",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True, index=True),
)

# Convenient aliases
user_roles = model_has_roles
role_permissions = role_has_permissions
user_permissions = model_has_permissions


# ==============================================================================
# Permission Model
# ==============================================================================

class Permission(Base, TimestampMixin):
    """
    Permission entity representing granular system actions.
    Inspired by Spatie's Permission model:
      - id: UUID Primary Key
      - name: Unique permission identifier (e.g. 'users.create', 'roles.view')
      - guard_name: Access boundary (e.g. 'web', 'api')
      - description: Human-readable explanation of what this permission permits
    """
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(100), nullable=False, index=True)
    guard_name = Column(String(50), default="web", nullable=False)
    description = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("name", "guard_name", name="uq_permissions_name_guard_name"),
    )

    # Relationships
    roles = relationship(
        "Role",
        secondary=role_has_permissions,
        back_populates="permissions",
        lazy="selectin",
    )
    users = relationship(
        "User",
        secondary=model_has_permissions,
        back_populates="permissions",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Permission {self.name} (guard={self.guard_name})>"


# ==============================================================================
# Role Model
# ==============================================================================

class Role(Base, TimestampMixin):
    """
    Role entity grouping multiple permissions.
    Inspired by Spatie's Role model:
      - id: UUID Primary Key
      - name: Role name (e.g. 'admin', 'doctor', 'nurse', 'receptionist')
      - guard_name: Access boundary (e.g. 'web', 'api')
      - description: Human-readable role description
      - permissions: Many-to-Many relation with Permission
      - users: Many-to-Many relation with User
    """
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(100), nullable=False, index=True)
    guard_name = Column(String(50), default="web", nullable=False)
    description = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("name", "guard_name", name="uq_roles_name_guard_name"),
    )

    # Relationships
    permissions = relationship(
        "Permission",
        secondary=role_has_permissions,
        back_populates="roles",
        lazy="selectin",
    )
    users = relationship(
        "User",
        secondary=model_has_roles,
        back_populates="roles",
        lazy="selectin",
    )

    def give_permission_to(self, *perms: Permission) -> None:
        """Assign one or more permission instances to this role."""
        for p in perms:
            if p not in self.permissions:
                self.permissions.append(p)

    def revoke_permission_to(self, *perms: Permission) -> None:
        """Revoke one or more permission instances from this role."""
        for p in perms:
            if p in self.permissions:
                self.permissions.remove(p)

    def sync_permissions(self, perms: List[Permission]) -> None:
        """Replace all current permissions on this role with the specified list."""
        self.permissions = list(perms)

    def has_permission_to(self, permission_name: str) -> bool:
        """Determine if this role grants the specified permission."""
        return any(p.name == permission_name for p in self.permissions)

    def get_permission_names(self) -> Set[str]:
        """Return the set of all permission names assigned to this role."""
        return {p.name for p in self.permissions}

    def __repr__(self) -> str:
        return f"<Role {self.name} (guard={self.guard_name})>"
