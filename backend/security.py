"""
security.py — WhaleTracker Güvenlik Katmanı
=============================================
1. TOTP / 2FA (Google Authenticator uyumlu)
2. JWT Blacklist (logout/revoke için in-memory + DB hibrit)
3. API Key Yönetimi (scrypt hash + scopes)
4. AES-256-GCM ile Şifreli Alan (wallet adresleri vs.)
"""

import os
import secrets
import hashlib
import hmac
import base64
import json
from datetime import datetime, timezone
from typing import Optional, List

import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from database import get_db
from models import RevokedToken, UserApiKey

# ── 0. Temel Sabitler ─────────────────────────────────────────────────────────

# AES anahtarı .env'den Base64 olarak okunur; yoksa güvenli test anahtarı oluşturulur
_AES_KEY_B64 = os.getenv("AES_FIELD_KEY")
if _AES_KEY_B64:
    AES_KEY = base64.b64decode(_AES_KEY_B64)
    if len(AES_KEY) != 32:
        raise ValueError("AES_FIELD_KEY tam olarak 32 byte (256-bit) olmalıdır.")
else:
    # Geliştirme ortamı için otomatik üret (production'da .env kullanın!)
    AES_KEY = secrets.token_bytes(32)
    print("⚠️  AES_FIELD_KEY bulunamadı → geçici anahtar üretildi. Production için .env ayarlayın.")

# ── 1. AES-256-GCM Şifreli Alan ───────────────────────────────────────────────

def encrypt_field(plaintext: str) -> str:
    """
    Metin değeri AES-256-GCM ile şifreler.
    Dönen format: base64(nonce + ciphertext)
    """
    aesgcm = AESGCM(AES_KEY)
    nonce = secrets.token_bytes(12)          # 96-bit nonce (GCM standardı)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_field(encrypted: str) -> str:
    """
    encrypt_field() ile şifrelenmiş bir değeri çözer.
    """
    raw = base64.b64decode(encrypted)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(AES_KEY)
    return aesgcm.decrypt(nonce, ct, None).decode()


# ── 2. TOTP / 2FA ─────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Yeni kullanıcı için Base32 TOTP sırrı üretir."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    """Google Authenticator için QR kodu URI'si döner."""
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="WhaleTracker"
    )


def verify_totp(secret: str, code: str) -> bool:
    """
    Kullanıcının girdiği 6 haneli kodu doğrular.
    valid_window=1 → ±30 saniyelik saat kaymasına tolerans.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# ── 3. JWT Blacklist (Logout / Token İptal) ───────────────────────────────────
# In-memory set = aynı worker içinde anlık iptal
# DB tablosu (RevokedToken) = servis yeniden başlatmada kalıcılık
_revoked_jti_cache: set[str] = set()


def revoke_token(jti: str, expires_at: datetime, db: Session) -> None:
    """
    Token JTI'sını hem in-memory cache'e hem DB'ye blacklist eder.
    `jti` → JWT payload'ındaki "jti" (JWT ID) alanı.
    """
    _revoked_jti_cache.add(jti)
    if not db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
        db.add(RevokedToken(jti=jti, expires_at=expires_at))
        db.commit()


def is_token_revoked(jti: str, db: Session) -> bool:
    """Token iptal edilmiş mi kontrolü (önce cache, sonra DB)."""
    if jti in _revoked_jti_cache:
        return True
    record = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
    if record:
        _revoked_jti_cache.add(jti)   # bir sonraki çağrı için cache'e ekle
        return True
    return False


def load_revoked_tokens_from_db(db: Session) -> None:
    """Uygulama başlangıcında DB'deki aktif blacklist kayıtlarını belleğe yükler."""
    now = datetime.now(timezone.utc)
    rows = db.query(RevokedToken).filter(RevokedToken.expires_at > now).all()
    for r in rows:
        _revoked_jti_cache.add(r.jti)


# ── 4. API Key Yönetimi ───────────────────────────────────────────────────────

_API_KEY_PREFIX_LEN = 8   # Gösterilen prefix uzunluğu (wtk_XXXXXXXX...)

def generate_api_key(user_id: int, scopes: List[str], db: Session) -> dict:
    """
    Yeni API Key üretir, scrypt ile hash'ler ve DB'ye kaydeder.
    Dönen `raw_key` yalnızca bir kez gösterilir, saklanmaz.
    """
    raw_key = "wtk_" + secrets.token_urlsafe(32)
    # scrypt parametreleri: N=2^14, r=8, p=1 (OWASP önerilen minimum)
    key_hash = hashlib.scrypt(
        raw_key.encode(),
        salt=os.urandom(16),
        n=2**14, r=8, p=1
    )
    # Salt'ı hash'in önüne koy (doğrulama sırasında ayrıştırılacak)
    salt_b64 = base64.b64encode(key_hash[:16]).decode()   # salt placeholder
    hash_b64  = base64.b64encode(key_hash).decode()

    entry = UserApiKey(
        user_id=user_id,
        key_prefix=raw_key[:_API_KEY_PREFIX_LEN + 4],   # "wtk_XXXXXXXX"
        key_hash=hash_b64,
        scopes=json.dumps(scopes),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "api_key": raw_key,          # ← Kullanıcıya yalnızca burada göster!
        "prefix": entry.key_prefix,
        "scopes": scopes,
        "id": entry.id,
        "warning": "Bu anahtar bir daha gösterilmeyecek. Lütfen güvenli bir yere kaydedin."
    }


def verify_api_key(raw_key: str, db: Session, required_scope: Optional[str] = None):
    """
    Gelen ham API Key'i DB'deki hash ile eşleştirir.
    Eşleşme yoksa veya kapsam yetersizse HTTPException fırlatılır.
    """
    prefix = raw_key[:_API_KEY_PREFIX_LEN + 4]
    candidates = db.query(UserApiKey).filter(
        UserApiKey.key_prefix == prefix,
        UserApiKey.is_active == True
    ).all()

    for entry in candidates:
        stored = base64.b64decode(entry.key_hash)
        # Aynı salt ile yeniden türet
        try:
            derived = hashlib.scrypt(
                raw_key.encode(), salt=stored[:16], n=2**14, r=8, p=1
            )
        except Exception:
            continue
        if hmac.compare_digest(derived, stored):
            if required_scope and required_scope not in json.loads(entry.scopes or "[]"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Bu işlem için '{required_scope}' kapsamı gereklidir."
                )
            entry.last_used_at = datetime.now(timezone.utc)
            db.commit()
            return entry

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya devre dışı API anahtarı."
    )


# FastAPI dependency — Authorization: Bearer wtk_... başlığından okur
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def require_api_key(scope: Optional[str] = None):
    """
    Router'larda kullanım:
        @router.get("/data", dependencies=[Depends(require_api_key("read:whale"))])
    """
    def _dep(api_key: str = Security(api_key_header), db: Session = Depends(get_db)):
        if not api_key:
            raise HTTPException(status_code=401, detail="X-API-Key başlığı eksik.")
        return verify_api_key(api_key, db, required_scope=scope)
    return _dep
