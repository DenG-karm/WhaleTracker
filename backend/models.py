from sqlalchemy import Column, ForeignKey, Integer, String, Numeric, Text, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    avatar_url = Column(Text, nullable=True)
    strategy_description = Column(Text, nullable=True)
    # ── 2FA / TOTP ──────────────────────────────────────────
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    # ── Trader DNA (Onboarding Profili) ─────────────────────
    trader_profile = Column(Text, nullable=True)
    # ── Abonelik / Stripe ────────────────────────────────────
    subscription_status   = Column(String(20), nullable=False, default="free")   # free | pro | cancelled
    trial_ends_at         = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id    = Column(String(64), nullable=True, unique=True, index=True)
    stripe_subscription_id = Column(String(64), nullable=True)


class UserGoal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    goal_name = Column(String, default="Ana Hedef")
    target_amount = Column(Numeric(15, 2), default=10000.00)
    daily_loss_limit = Column(Numeric(15, 2), default=500.00)
    max_drawdown = Column(Numeric(15, 2), default=1000.00)
    starting_balance = Column(Numeric(15, 2), default=10000.00)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    symbol = Column(String, index=True, nullable=False)
    asset_type = Column(String(10), nullable=False, default="crypto")  # 'crypto' | 'stock'

    __table_args__ = (
        Index("ix_user_symbol_watchlist", "user_id", "symbol", unique=True),
    )

class TradeLog(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    trade_type = Column(String(10), default="MARGIN", index=True) # YENİ: MARGIN (Kaldıraçlı) veya SPOT
    title = Column(String, nullable=True)
    symbol = Column(String, index=True)
    entry_price = Column(Numeric(18, 8))
    stop_loss = Column(Numeric(18, 8), nullable=True) # Spot için zorunlu değil
    position_size = Column(Numeric(18, 8), nullable=True) # YENİ: Alınan coin/hisse adedi
    risk_amount = Column(Numeric(15, 2))
    risk_percentage = Column(Numeric(5, 2))
    status = Column(String(10), default="OPEN", index=True)
    exit_price = Column(Numeric(18, 8), nullable=True)
    close_note = Column(Text, nullable=True)
    strategy_note = Column(Text, nullable=True)
    psychology_note = Column(Text, nullable=True)
    risk_note = Column(Text, nullable=True)
    screenshot = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    pnl = Column(Numeric(15, 2), default=0.00)
    macro_events = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_user_status_date", "user_id", "status", "date"),
    )


# ── JWT Blacklist (Logout / Token Revoke) ─────────────────────────────────────
class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, index=True, nullable=False)  # JWT ID
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── API Key Yönetimi ──────────────────────────────────────────────────────────
class UserApiKey(Base):
    __tablename__ = "user_api_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    key_prefix = Column(String(20), index=True, nullable=False)    # wtk_XXXXXXXX
    key_hash = Column(Text, nullable=False)                        # scrypt hash
    scopes = Column(Text, default="[]")                            # JSON liste
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), nullable=True)


# ── AI Log (JSONB metadata: psychology_score, is_revenge_trade, …) ────────────
class AiLog(Base):
    __tablename__ = "ai_logs"
    id         = Column(Integer, primary_key=True, index=True)
    trade_id   = Column(Integer, ForeignKey("trades.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    # JSONB: {"psychology_score": 8.5, "is_revenge_trade": false, "ai_summary": "…"}
    meta       = Column("metadata", JSONB, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_ai_logs_user_trade", "user_id", "trade_id"),
    )


# ── AI Chat Geçmişi ───────────────────────────────────────────────────────────
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title      = Column(String(255), nullable=False, default="Yeni Sohbet")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_archived = Column(Boolean, default=False)

    __table_args__ = (
        Index("ix_chat_sessions_user_updated", "user_id", "updated_at"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    role       = Column(String(10), nullable=False)   # 'user' | 'assistant'
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_chat_messages_session_created", "session_id", "created_at"),
    )


# ── Kayıtlı Cüzdanlar (Akıllı Adres Defteri) ─────────────────────────────────
class SavedWallet(Base):
    __tablename__ = "saved_wallets"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    wallet_address = Column(String(42), nullable=False)
    wallet_name    = Column(String(100), nullable=True, default="Unknown Wallet")
    last_analyzed  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_saved_wallets_user_addr", "user_id", "wallet_address", unique=True),
    )


# ── Güvenilir Cihazlar (Device Fingerprinting) ────────────────────────────────
class TrustedDevice(Base):
    __tablename__ = "trusted_devices"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_trusted_devices_user_device", "user_id", "device_id", unique=True),
    )


# ── OTP Kodları (E-posta Doğrulama) ──────────────────────────────────────────
class OTPCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)