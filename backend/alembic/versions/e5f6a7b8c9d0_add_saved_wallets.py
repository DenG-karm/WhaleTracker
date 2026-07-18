"""add saved_wallets table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-19 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'saved_wallets',
        sa.Column('id',             sa.Integer(),     nullable=False),
        sa.Column('user_id',        sa.Integer(),     nullable=False),
        sa.Column('wallet_address', sa.String(42),    nullable=False),
        sa.Column('wallet_name',    sa.String(100),   nullable=True),
        sa.Column('last_analyzed',  sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_saved_wallets_id',        'saved_wallets', ['id'],                        unique=False)
    op.create_index('ix_saved_wallets_user_id',   'saved_wallets', ['user_id'],                   unique=False)
    op.create_index('ix_saved_wallets_user_addr', 'saved_wallets', ['user_id', 'wallet_address'], unique=True)


def downgrade():
    op.drop_index('ix_saved_wallets_user_addr', table_name='saved_wallets')
    op.drop_index('ix_saved_wallets_user_id',   table_name='saved_wallets')
    op.drop_index('ix_saved_wallets_id',        table_name='saved_wallets')
    op.drop_table('saved_wallets')
