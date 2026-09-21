"""change_user_status_to_enum

Revision ID: 924b60965d19
Revises: b2e71abde11f
Create Date: 2026-09-21 15:53:11.006518

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '924b60965d19'
down_revision: Union[str, Sequence[str], None] = 'b2e71abde11f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define PostgreSQL ENUM
user_status_enum = postgresql.ENUM('active', 'baned', 'blocked', 'deactived', name='user_status')


def upgrade() -> None:
    """Upgrade schema to use PostgreSQL ENUM for status."""
    # 1. Create the user_status ENUM type in PostgreSQL if it doesn't already exist
    user_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Drop existing server default before type change to prevent cast mismatch
    op.alter_column('users', 'status', server_default=None)

    # 3. Alter column type using explicit cast
    op.alter_column(
        'users',
        'status',
        existing_type=sa.VARCHAR(length=30),
        type_=user_status_enum,
        existing_nullable=False,
        postgresql_using='status::user_status',
        server_default='active'
    )


def downgrade() -> None:
    """Downgrade schema back to VARCHAR."""
    # 1. Alter column back to VARCHAR
    op.alter_column(
        'users',
        'status',
        existing_type=user_status_enum,
        type_=sa.VARCHAR(length=30),
        existing_nullable=False,
        postgresql_using='status::varchar',
        server_default='active'
    )

    # 2. Drop the ENUM type
    user_status_enum.drop(op.get_bind(), checkfirst=True)
