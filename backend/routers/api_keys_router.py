"""
api_keys_router.py — API Key CRUD Endpoint'leri
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime

from database import get_db
from models import User, UserApiKey
from auth import get_current_user
from security import generate_api_key

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class CreateApiKeyRequest(BaseModel):
    scopes: List[str] = ["read:whale", "read:trades"]
    label: Optional[str] = None


class ApiKeyResponse(BaseModel):
    id: int
    key_prefix: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/", summary="Yeni API Anahtarı Oluştur")
def create_key(
    body: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı adına yeni bir API Key üretir.
    Ham anahtar (wtk_...) yalnızca bu yanıtta görünür, tekrar gösterilmez.
    """
    existing = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.is_active == True
    ).count()
    if existing >= 5:
        raise HTTPException(status_code=400, detail="En fazla 5 aktif API anahtarınız olabilir.")

    return generate_api_key(current_user.id, body.scopes, db)


@router.get("/", response_model=List[ApiKeyResponse], summary="API Anahtarlarını Listele")
def list_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    keys = db.query(UserApiKey).filter(UserApiKey.user_id == current_user.id).all()
    result = []
    for k in keys:
        result.append(ApiKeyResponse(
            id=k.id,
            key_prefix=k.key_prefix,
            scopes=json.loads(k.scopes or "[]"),
            is_active=k.is_active,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
        ))
    return result


@router.delete("/{key_id}", summary="API Anahtarını Devre Dışı Bırak")
def revoke_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = db.query(UserApiKey).filter(
        UserApiKey.id == key_id,
        UserApiKey.user_id == current_user.id
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="Anahtar bulunamadı.")
    key.is_active = False
    db.commit()
    return {"status": "ok", "msg": f"API anahtarı ({key.key_prefix}...) devre dışı bırakıldı."}
