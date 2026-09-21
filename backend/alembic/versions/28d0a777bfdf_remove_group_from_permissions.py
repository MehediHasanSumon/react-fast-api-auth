"""remove_group_from_permissions

Revision ID: 28d0a777bfdf
Revises: 56a76628c8c8
Create Date: 2026-09-21 22:43:04.616653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '28d0a777bfdf'
down_revision: Union[str, Sequence[str], None] = '56a76628c8c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index('ix_permissions_group', table_name='permissions')
    op.drop_column('permissions', 'group')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('permissions', sa.Column('group', sa.String(length=100), nullable=True))
    op.create_index('ix_permissions_group', 'permissions', ['group'], unique=False)

