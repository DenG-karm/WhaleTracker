"""add ai_logs table with jsonb metadata

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-06 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = inspector.get_table_names()
    if "ai_logs" not in existing:
        op.create_table(
            "ai_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column(
                "trade_id",
                sa.Integer(),
                sa.ForeignKey("trades.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("user_id", sa.Integer(), nullable=False),
            # JSONB sütunu: is_revenge_trade (bool), psychology_score (numeric 0-10), vs.
            sa.Column(
                "metadata",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default="{}",
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ai_logs_id",       "ai_logs", ["id"],       unique=False)
        op.create_index("ix_ai_logs_trade_id", "ai_logs", ["trade_id"], unique=False)
        op.create_index("ix_ai_logs_user_id",  "ai_logs", ["user_id"],  unique=False)
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_ai_logs_metadata_gin ON ai_logs USING GIN (metadata jsonb_path_ops)"
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ai_logs_metadata_gin")
    op.drop_index("ix_ai_logs_user_id",  table_name="ai_logs")
    op.drop_index("ix_ai_logs_trade_id", table_name="ai_logs")
    op.drop_index("ix_ai_logs_id",       table_name="ai_logs")
    op.drop_table("ai_logs")
