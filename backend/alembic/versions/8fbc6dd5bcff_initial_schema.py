"""initial_schema

Revision ID: 8fbc6dd5bcff
Revises:
Create Date: 2026-04-18 16:28:24.208076

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '8fbc6dd5bcff'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = inspector.get_table_names()

    if "users" not in existing:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('email', sa.String(), nullable=True),
            sa.Column('hashed_password', sa.String(), nullable=True),
            sa.Column('full_name', sa.String(), nullable=True),
            sa.Column('avatar_url', sa.Text(), nullable=True),
            sa.Column('strategy_description', sa.Text(), nullable=True),
            sa.Column('totp_secret', sa.String(), nullable=True),
            sa.Column('totp_enabled', sa.Boolean(), nullable=True),
            sa.Column('trader_profile', sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_users_id', 'users', ['id'], unique=False)
        op.create_index('ix_users_email', 'users', ['email'], unique=True)

    if "goals" not in existing:
        op.create_table(
            'goals',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('goal_name', sa.String(), nullable=True),
            sa.Column('target_amount', sa.Numeric(15, 2), nullable=True),
            sa.Column('daily_loss_limit', sa.Numeric(15, 2), nullable=True),
            sa.Column('max_drawdown', sa.Numeric(15, 2), nullable=True),
            sa.Column('starting_balance', sa.Numeric(15, 2), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_goals_id', 'goals', ['id'], unique=False)
        op.create_index('ix_goals_user_id', 'goals', ['user_id'], unique=False)

    if "watchlist_items" not in existing:
        op.create_table(
            'watchlist_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('symbol', sa.String(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'symbol', name='ix_user_symbol_watchlist'),
        )
        op.create_index('ix_watchlist_items_id', 'watchlist_items', ['id'], unique=False)
        op.create_index('ix_watchlist_items_user_id', 'watchlist_items', ['user_id'], unique=False)
        op.create_index('ix_watchlist_items_symbol', 'watchlist_items', ['symbol'], unique=False)

    if "trades" not in existing:
        op.create_table(
            'trades',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('trade_type', sa.String(10), nullable=True),
            sa.Column('title', sa.String(), nullable=True),
            sa.Column('symbol', sa.String(), nullable=True),
            sa.Column('entry_price', sa.Numeric(18, 8), nullable=True),
            sa.Column('stop_loss', sa.Numeric(18, 8), nullable=True),
            sa.Column('position_size', sa.Numeric(18, 8), nullable=True),
            sa.Column('risk_amount', sa.Numeric(15, 2), nullable=True),
            sa.Column('risk_percentage', sa.Numeric(5, 2), nullable=True),
            sa.Column('status', sa.String(10), nullable=True),
            sa.Column('exit_price', sa.Numeric(18, 8), nullable=True),
            sa.Column('close_note', sa.Text(), nullable=True),
            sa.Column('strategy_note', sa.Text(), nullable=True),
            sa.Column('psychology_note', sa.Text(), nullable=True),
            sa.Column('risk_note', sa.Text(), nullable=True),
            sa.Column('screenshot', sa.Text(), nullable=True),
            sa.Column('ai_feedback', sa.Text(), nullable=True),
            sa.Column('pnl', sa.Numeric(15, 2), nullable=True),
            sa.Column('macro_events', sa.Text(), nullable=True),
            sa.Column('date', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_trades_id', 'trades', ['id'], unique=False)
        op.create_index('ix_trades_user_id', 'trades', ['user_id'], unique=False)
        op.create_index('ix_trades_symbol', 'trades', ['symbol'], unique=False)
        op.create_index('ix_trades_status', 'trades', ['status'], unique=False)
        op.create_index('ix_trades_trade_type', 'trades', ['trade_type'], unique=False)
        op.create_index('ix_trades_date', 'trades', ['date'], unique=False)
        op.create_index('ix_user_status_date', 'trades', ['user_id', 'status', 'date'], unique=False)

    if "revoked_tokens" not in existing:
        op.create_table(
            'revoked_tokens',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('jti', sa.String(), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_revoked_tokens_id', 'revoked_tokens', ['id'], unique=False)
        op.create_index('ix_revoked_tokens_jti', 'revoked_tokens', ['jti'], unique=True)

    if "user_api_keys" not in existing:
        op.create_table(
            'user_api_keys',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('key_prefix', sa.String(20), nullable=False),
            sa.Column('key_hash', sa.Text(), nullable=False),
            sa.Column('scopes', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_user_api_keys_id', 'user_api_keys', ['id'], unique=False)
        op.create_index('ix_user_api_keys_user_id', 'user_api_keys', ['user_id'], unique=False)
        op.create_index('ix_user_api_keys_key_prefix', 'user_api_keys', ['key_prefix'], unique=False)


def downgrade() -> None:
    op.drop_table('user_api_keys')
    op.drop_table('revoked_tokens')
    op.drop_table('trades')
    op.drop_table('watchlist_items')
    op.drop_table('goals')
    op.drop_table('users')
