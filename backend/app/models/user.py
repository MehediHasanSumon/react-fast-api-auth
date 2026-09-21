import uuid
import enum
from typing import List, Set, TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
from app.models.rbac import model_has_roles, model_has_permissions

if TYPE_CHECKING:
    from app.models.rbac import Role, Permission


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BANED = "baned"
    BLOCKED = "blocked"
    DEACTIVED = "deactived"


class User(Base, TimestampMixin):
    """
    User model for authentication and system accounts.
    Fields:
      - id: UUID Primary Key
      - name: Full name
      - email: Unique login email
      - mobile_number: Contact phone number
      - avatar: Image URL / path
      - password: Hash of password
      - is_verified: Email / phone verification status
      - status: User account state as PostgreSQL Enum (active, baned, blocked, deactived)
      - created_at & updated_at: Timestamps
      - roles: Many-to-Many relationship with Role (Spatie-style)
      - permissions: Many-to-Many relationship with Permission (Spatie direct permissions)
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile_number = Column(String(20), unique=True, index=True, nullable=True)
    avatar = Column(String(500), nullable=True)
    password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False, index=True)
    role = Column(String(50), default="Doctor", nullable=False, index=True)
    department = Column(String(100), default="General Medicine", nullable=False, index=True)
    status = Column(
        SQLEnum(UserStatus, name="user_status", values_callable=lambda obj: [e.value for e in obj]),
        default=UserStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

    # Spatie-style RBAC Many-to-Many Relationships
    roles = relationship(
        "Role",
        secondary=model_has_roles,
        back_populates="users",
        lazy="selectin",
    )
    permissions = relationship(
        "Permission",
        secondary=model_has_permissions,
        back_populates="users",
        lazy="selectin",
    )

    # --------------------------------------------------------------------------
    # Spatie Role Management Helpers
    # --------------------------------------------------------------------------

    def assign_role(self, *roles: "Role") -> None:
        """Assign one or more roles to this user."""
        for r in roles:
            if r not in self.roles:
                self.roles.append(r)

    def remove_role(self, *roles: "Role") -> None:
        """Remove one or more roles from this user."""
        for r in roles:
            if r in self.roles:
                self.roles.remove(r)

    def sync_roles(self, roles: List["Role"]) -> None:
        """Replace all assigned roles with the given list."""
        self.roles = list(roles)

    def has_role(self, role_name: str) -> bool:
        """Determine if the user has the specified role."""
        return any(r.name == role_name for r in self.roles)

    def has_any_role(self, *role_names: str) -> bool:
        """Determine if the user has any of the given roles."""
        assigned = {r.name for r in self.roles}
        return bool(assigned.intersection(role_names))

    def has_all_roles(self, *role_names: str) -> bool:
        """Determine if the user has all of the given roles."""
        assigned = {r.name for r in self.roles}
        return set(role_names).issubset(assigned)

    def get_role_names(self) -> List[str]:
        """Return list of all role names assigned to this user."""
        return [r.name for r in self.roles]

    # --------------------------------------------------------------------------
    # Spatie Permission Management Helpers
    # --------------------------------------------------------------------------

    def give_permission_to(self, *perms: "Permission") -> None:
        """Assign direct permission(s) to this user."""
        for p in perms:
            if p not in self.permissions:
                self.permissions.append(p)

    def revoke_permission_to(self, *perms: "Permission") -> None:
        """Revoke direct permission(s) from this user."""
        for p in perms:
            if p in self.permissions:
                self.permissions.remove(p)

    def sync_permissions(self, perms: List["Permission"]) -> None:
        """Replace all direct permissions with the specified list."""
        self.permissions = list(perms)

    def has_direct_permission(self, permission_name: str) -> bool:
        """Check if user has permission assigned directly."""
        return any(p.name == permission_name for p in self.permissions)

    def has_permission_to(self, permission_name: str) -> bool:
        """
        Check if user has permission either directly OR inherited through any assigned role.
        Replicates exact Laravel Spatie $user->hasPermissionTo() behavior.
        """
        if self.has_direct_permission(permission_name):
            return True
        return any(role.has_permission_to(permission_name) for role in self.roles)

    def has_any_permission(self, *permission_names: str) -> bool:
        """Determine if user has ANY of the specified permissions."""
        all_perms = self.get_all_permissions()
        return bool(all_perms.intersection(permission_names))

    def has_all_permissions(self, *permission_names: str) -> bool:
        """Determine if user has ALL of the specified permissions."""
        all_perms = self.get_all_permissions()
        return set(permission_names).issubset(all_perms)

    def get_all_permissions(self) -> Set[str]:
        """
        Return the combined set of all permissions (direct + inherited through all roles).
        Replicates exact Laravel Spatie $user->getAllPermissions().
        """
        direct = {p.name for p in self.permissions}
        from_roles = {p.name for r in self.roles for p in r.permissions}
        return direct.union(from_roles)

    @property
    def all_permissions_list(self) -> List[str]:
        """List of all effective permissions sorted alphabetically."""
        return sorted(list(self.get_all_permissions()))

    @property
    def role_names_list(self) -> List[str]:
        """List of all assigned role names sorted alphabetically."""
        return sorted(self.get_role_names())

    def __repr__(self) -> str:
        status_val = self.status.value if isinstance(self.status, enum.Enum) else self.status
        return f"<User {self.email} ({status_val})>"
