from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Literal
from decimal import Decimal
import json
from database import get_db
from models import User, UserGoal
from auth import get_current_user, hash_password, verify_password

router = APIRouter()


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    full_name: str
    strategy_description: str
    target_amount: Decimal
    daily_loss_limit: Decimal
    avatar_url: Optional[str] = None


@router.post("/change-password")
def change_password(data: ChangePassword, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.old_password, current_user.hashed_password):
        return {"status": "error", "msg": "Eski şifre yanlış."}
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"status": "ok", "msg": "Şifre değiştirildi."}


@router.post("/update-profile")
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    g = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    current_user.full_name = data.full_name
    current_user.strategy_description = data.strategy_description
    current_user.avatar_url = data.avatar_url
    if g:
        g.target_amount = data.target_amount
        g.daily_loss_limit = data.daily_loss_limit
    db.commit()
    return {"status": "updated"}


# ── Onboarding / Trader DNA ───────────────────────────────────────────────────

class OnboardingProfile(BaseModel):
    trading_style: Literal["Scalper", "Day Trader", "Swing", "Investor"]
    risk_tolerance: Literal["Low", "Medium", "High"]
    primary_markets: List[Literal["Crypto", "Stocks", "Forex", "Commodities"]]


@router.post("/users/onboarding")
def save_onboarding(
    data: OnboardingProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kullanıcının Trader DNA profilini kaydeder.
    Bir kez doldurulabilir; sonradan /update-profile üzerinden de güncellenebilir.
    """
    current_user.trader_profile = json.dumps({
        "trading_style": data.trading_style,
        "risk_tolerance": data.risk_tolerance,
        "primary_markets": data.primary_markets,
    }, ensure_ascii=False)
    db.commit()
    return {"status": "ok", "msg": "Trader DNA profili kaydedildi."}


@router.get("/users/onboarding-status")
def get_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kullanıcının onboarding profilinin dolu olup olmadığını döner."""
    if current_user.trader_profile:
        try:
            profile = json.loads(current_user.trader_profile)
            return {"has_profile": True, "profile": profile}
        except (json.JSONDecodeError, TypeError):
            pass
    return {"has_profile": False, "profile": None}


@router.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Oturum açmış kullanıcının temel profilini döner (subscription_status dahil)."""
    # ── BETA: Tüm kullanıcılara tam erişim ─────────────────────────────────
    # Beta sona erdiğinde bu satırı kaldır ve subscription_status'u kullan.
    effective_status = "beta"
    return {
        "id":                    current_user.id,
        "email":                 current_user.email,
        "full_name":             current_user.full_name,
        "avatar_url":            current_user.avatar_url,
        "subscription_status":   effective_status,
        "trial_ends_at":         current_user.trial_ends_at.isoformat() if current_user.trial_ends_at else None,
    }