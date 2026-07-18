import bcrypt
import jwt
import warnings
import uuid
import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address

load_dotenv()

# PyJWT'nin InsecureKeyLengthWarning'ini uygulama seviyesinde yönet
try:
    from jwt.warnings import InsecureKeyLengthWarning
    warnings.filterwarnings("ignore", category=InsecureKeyLengthWarning)
except ImportError:
    pass

_auth_logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "fallback_key_degistir")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12

# SECRET_KEY uzunluğu kontrolü — Railway'de en az 32 karakter olmalı
_key_bytes = len(SECRET_KEY.encode("utf-8"))
if _key_bytes < 32:
    _auth_logger.warning(
        "[SECURITY] SECRET_KEY sadece %d byte. Min 32 byte önerilir. "
        "Railway SECRET_KEY env var'ını güncelleyin: "
        "python -c \"import secrets; print(secrets.token_hex(32))\"",
        _key_bytes,
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# GÜVENLİK GÜNCELLEMESİ: Rate Limiting (Hız Sınırlandırması) için Limiter tanımlandı
limiter = Limiter(key_func=get_remote_address)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    GÜVENLİK GÜNCELLEMESİ: Her token'a benzersiz bir 'jti' (JWT ID) eklendi.
    Bu ID, logout sırasında token'ı blacklist'e almak için kullanılır.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),   # ← Benzersiz token kimliği
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token_payload(token: str) -> dict:
    """Token doğrulamadan payload'ı döner (blacklist kontrolü için)."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return {}


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    GÜVENLİK GÜNCELLEMESİ: Token doğrulaması artık JWT blacklist kontrolü de içeriyor.
    Revoke edilmiş (logout yapılmış) token'lar 401 döner.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı. Token geçersiz veya süresi dolmuş.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        jti: str = payload.get("jti")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    # ── Blacklist Kontrolü ────────────────────────────────────────────────────
    # Circular import'u önlemek için burada lazy import yapıyoruz
    if jti:
        from security import is_token_revoked
        if is_token_revoked(jti, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Oturum sonlandırılmış. Lütfen tekrar giriş yapın.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user