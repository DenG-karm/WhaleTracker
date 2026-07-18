"""add_asset_type_to_watchlist

Revision ID: a1b2c3d4e5f6
Revises: 8fbc6dd5bcff
Create Date: 2026-04-19 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8fbc6dd5bcff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('watchlist_items')]
    if 'asset_type' not in cols:
        op.add_column(
            'watchlist_items',
            sa.Column('asset_type', sa.String(10), nullable=False, server_default='crypto')
        )


def downgrade() -> None:
    op.drop_column('watchlist_items', 'asset_type')
