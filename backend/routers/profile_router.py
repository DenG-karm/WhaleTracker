from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

from database import get_db
from models import User, UserGoal
from auth import get_current_user

router = APIRouter()

class ProfileSettings(BaseModel):
    full_name: str = Field(..., min_length=2)
    strategy_description: Optional[str] = ""
    target_amount: Decimal = Field(..., gt=0)
    daily_loss_limit: Decimal = Field(..., gt=0)
    max_drawdown: Decimal = Field(..., gt=0)


@router.get("/profile", response_model=ProfileSettings)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()

    # Eğer kullanıcının hedefi yoksa, varsayılan değerlerle bir tane oluştur
    if not user_goal:
        user_goal = UserGoal(user_id=current_user.id)
        db.add(user_goal)
        db.commit()
        db.refresh(user_goal)

    # User ve UserGoal modellerinden verileri birleştirip Pydantic modeline doldur
    return ProfileSettings(
        full_name=current_user.full_name,
        strategy_description=current_user.strategy_description or "",
        target_amount=user_goal.target_amount,
        daily_loss_limit=user_goal.daily_loss_limit,
        max_drawdown=user_goal.max_drawdown
    )

@router.post("/profile")
def update_profile(settings: ProfileSettings, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # User modelini güncelle
    current_user.full_name = settings.full_name
    current_user.strategy_description = settings.strategy_description
    
    # UserGoal modelini güncelle
    user_goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    if not user_goal:
        # Bu senaryo get_profile'dan sonra pek olası değil ama güvenlik için ekleyelim
        user_goal = UserGoal(user_id=current_user.id)
        db.add(user_goal)

    user_goal.target_amount = settings.target_amount
    user_goal.daily_loss_limit = settings.daily_loss_limit
    user_goal.max_drawdown = settings.max_drawdown

    db.commit()
    return {"status": "ok", "message": "Profil ve hedefler başarıyla güncellendi."}