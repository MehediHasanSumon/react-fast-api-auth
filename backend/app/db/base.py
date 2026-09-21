from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """
    Base declarative class for all SQLAlchemy database models.
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """
        Default table name is lower-cased plural of class name if not overridden.
        """
        name = cls.__name__.lower()
        if name.endswith("y"):
            return name[:-1] + "ies"
        elif not name.endswith("s"):
            return name + "s"
        return name


class TimestampMixin:
    """
    Standard mixin adding timezone-aware created_at and updated_at timestamps.
    """

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
