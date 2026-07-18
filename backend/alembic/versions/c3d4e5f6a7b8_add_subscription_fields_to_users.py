"""add_subscription_fields_to_users

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-06 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('users')]
    indexes = [i['name'] for i in inspector.get_indexes('users')]

    if 'subscription_status' not in cols:
        op.add_column("users", sa.Column(
            "subscription_status",
            sa.String(20),
            nullable=False,
            server_default="free",
        ))
    if 'trial_ends_at' not in cols:
        op.add_column("users", sa.Column(
            "trial_ends_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ))
    if 'stripe_customer_id' not in cols:
        op.add_column("users", sa.Column(
            "stripe_customer_id",
            sa.String(64),
            nullable=True,
            unique=True,
        ))
    if 'stripe_subscription_id' not in cols:
        op.add_column("users", sa.Column(
            "stripe_subscription_id",
            sa.String(64),
            nullable=True,
        ))
    if 'ix_users_stripe_customer_id' not in indexes:
        op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])


def downgrade() -> None:
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "trial_ends_at")
    op.drop_column("users", "subscription_status")
