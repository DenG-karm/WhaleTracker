from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, validator
import random
import re
import logging
import httpx
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta
from database import get_db
from models import User, UserGoal, TrustedDevice, OTPCode
from utils.mail_service import send_otp_email
from auth import (
    hash_password, verify_password, create_access_token,
    decode_token_payload, limiter, get_current_user
)
from cache import otp_set, otp_check, otp_verify_and_delete


def _send_otp_email(to_email: str, code: str) -> bool:
    """Gmail SMTP ile OTP maili gönderir. Kimlik bilgisi yoksa sadece loglar."""
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        _logger.warning("[Auth] SMTP_USER veya SMTP_PASSWORD yok, mail gönderilmedi. OTP=%s", code)
        return False
    try:
        html_body = f"""
            <div style='font-family:sans-serif;max-width:480px;margin:auto'>
                <h2 style='color:#6366f1'>WhaleTracker</h2>
                <p>Kayıt doğrulama kodunuz:</p>
                <div style='font-size:32px;font-weight:bold;letter-spacing:8px;color:#6366f1;padding:16px 0'>{code}</div>
                <p style='color:#888;font-size:13px'>Bu kod 10 dakika geçerlidir. Eğer bu işlemi siz yapmadıysanız bu maili dikkate almayın.</p>
            </div>
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Doğrulama Kodunuz"
        msg["From"] = f"WhaleTracker <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        _logger.error("[Auth] Mail gönderilemedi: %s", e)
        return False

router = APIRouter()

_logger = logging.getLogger(__name__)

# ─── Beta Konfigürasyonu ──────────────────────────────────────────────────────
# Beta süresince tüm kısıtlamalar kaldırılmıştır.
# Maksimum 100 kullanıcı — dolunca yeni kayıt kabul edilmez.
BETA_MAX_USERS: int = 100

class EmailRequest(BaseModel):
    email: EmailStr

class CodeVerifyRequest(BaseModel):
    email: EmailStr
    code: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Şifre en az 8 karakter olmalıdır")
    full_name: str = Field(..., min_length=2, max_length=50)
    code: str  # Resend OTP — zorunlu

    @validator('password')
    def password_complexity(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError('Şifre en az bir büyük harf (A-Z) içermelidir.')
        if not re.search(r"\d", v):
            raise ValueError('Şifre en az bir rakam (0-9) içermelidir.')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_id: str | None = None      # Cihaz parmak izi
    totp_code: str | None = None      # 2FA aktifse zorunlu


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    device_id: str
    otp_code: str

class TotpVerify(BaseModel):
    totp_code: str

class PasswordResetRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=8, description="Şifre en az 8 karakter olmalıdır")

    @validator('new_password')
    def password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır.')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Şifre en az bir büyük harf (A-Z) içermelidir.')
        if not re.search(r"\d", v):
            raise ValueError('Şifre en az bir rakam (0-9) içermelidir.')
        return v

# ── Kayıt / OTP ──────────────────────────────────────────────────────────────

@router.post("/send-code")
@limiter.limit("5/minute")
async def send_code(request: Request, req: EmailRequest, db: Session = Depends(get_db)):
    """Kayıt öncesi e-postaya Resend üzerinden OTP gönderir."""
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")
    # Geçici kullanıcısız OTP — email'i anahtar olarak OTPCode'da user_id=0 saklıyoruz;
    # alternatif olarak Redis varsa otp_set kullanılabilir. Burada cache katmanını kullanıyoruz.
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    if not otp_set(req.email, code):
        raise HTTPException(status_code=500, detail="Sunucu hatası, lütfen tekrar deneyin.")
    result = await send_otp_email(req.email, code)
    if not result.get("success"):
        _logger.error("[Auth] Kayıt OTP gönderilemedi: %s", result.get("error"))
        raise HTTPException(status_code=500, detail="E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.")
    return {"status": "sent", "msg": "Doğrulama kodu e-postanıza gönderildi."}


@router.post("/verify-code")
@limiter.limit("10/minute")
def verify_code(request: Request, req: CodeVerifyRequest):
    """Frontend'in kod kutusunu doğrulamasına izin verir (register öncesi pre-check)."""
    if not otp_check(req.email, req.code):
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş kod.")
    return {"status": "valid"}


@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, u: UserRegister, db: Session = Depends(get_db)):
    # ── Beta kullanıcı limiti kontrolü ────────────────────────────────────
    user_count = db.query(User).count()
    if user_count >= BETA_MAX_USERS:
        raise HTTPException(status_code=403, detail="Beta kontenjanı doldu.")
    if db.query(User).filter(User.email == u.email).first():
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")
    # ── OTP doğrulaması (Resend üzerinden gönderilen kod) ─────────────────
    if not otp_verify_and_delete(u.email, u.code):
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş doğrulama kodu.")
    hashed_pw = hash_password(u.password)
    new_user = User(email=u.email, hashed_password=hashed_pw, full_name=u.full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.add(UserGoal(user_id=new_user.id))
    db.commit()
    return {"status": "created", "user_name": new_user.full_name, "user_id": new_user.id}


# ── Giriş (2FA destekli) ─────────────────────────────────────────────────────

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, u: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == u.email).first()
    if not user or not verify_password(u.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre.")

    # ── Cihaz Parmak İzi Kontrolü ─────────────────────────────────────────
    if u.device_id:
        trusted = (
            db.query(TrustedDevice)
            .filter(TrustedDevice.user_id == user.id, TrustedDevice.device_id == u.device_id)
            .first()
        )
        if trusted:
            # Tanınan cihaz → last_used_at güncelle, JWT döndür
            trusted.last_used_at = datetime.now(timezone.utc)
            db.commit()
            g = db.query(UserGoal).filter(UserGoal.user_id == user.id).first()
            if not g:
                g = UserGoal(user_id=user.id)
                db.add(g)
                db.commit()
                db.refresh(g)
            access_token = create_access_token(data={"sub": str(user.id)})
            return {
                "status": "ok",
                "token": access_token,
                "user_name": user.full_name,
                "user_id": user.id,
                "email": user.email,
                "avatar": user.avatar_url,
                "totp_enabled": user.totp_enabled,
                "subscription_status": "beta",
                "settings": {
                    "target": g.target_amount,
                    "dailyLoss": g.daily_loss_limit,
                    "strategy": user.strategy_description,
                },
            }
        else:
            # Tanınmayan cihaz → OTP gönder
            code = "".join([str(random.randint(0, 9)) for _ in range(6)])
            db.query(OTPCode).filter(OTPCode.user_id == user.id).delete()
            db.add(
                OTPCode(
                    user_id=user.id,
                    code=code,
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
                )
            )
            db.commit()
            result = await send_otp_email(user.email, code)
            if not result.get("success"):
                _logger.error("[Auth] OTP maili gönderilemedi: %s", result.get("error"))
                raise HTTPException(status_code=500, detail="Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.")
            return {"requires_otp": True, "message": "Verification code sent."}

    # ── device_id sağlanmadıysa mevcut TOTP akışına devam et ─────────────
    if user.totp_enabled and user.totp_secret:
        if not u.totp_code:
            return {"status": "2fa_required", "msg": "İki faktörlü doğrulama kodu gerekli."}
        from security import verify_totp, decrypt_field
        decrypted_secret = decrypt_field(user.totp_secret)
        if not verify_totp(decrypted_secret, u.totp_code):
            raise HTTPException(status_code=401, detail="Geçersiz 2FA kodu.")

    g = db.query(UserGoal).filter(UserGoal.user_id == user.id).first()
    if not g:
        g = UserGoal(user_id=user.id)
        db.add(g)
        db.commit()
        db.refresh(g)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "status": "ok",
        "token": access_token,
        "user_name": user.full_name,
        "user_id": user.id,
        "email": user.email,
        "avatar": user.avatar_url,
        "totp_enabled": user.totp_enabled,
        "subscription_status": "beta",
        "settings": {
            "target": g.target_amount,
            "dailyLoss": g.daily_loss_limit,
            "strategy": user.strategy_description,
        },
    }


@router.post("/verify-otp")
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    record = (
        db.query(OTPCode)
        .filter(OTPCode.user_id == user.id, OTPCode.code == body.otp_code)
        .first()
    )
    if not record:
        raise HTTPException(status_code=401, detail="Geçersiz doğrulama kodu.")
    if record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=401, detail="Doğrulama kodunun süresi dolmuş.")

    # OTP geçerli → cihazı güven listesine ekle, kaydı sil
    db.delete(record)
    existing_device = (
        db.query(TrustedDevice)
        .filter(TrustedDevice.user_id == user.id, TrustedDevice.device_id == body.device_id)
        .first()
    )
    if not existing_device:
        db.add(
            TrustedDevice(
                user_id=user.id,
                device_id=body.device_id,
            )
        )
    db.commit()

    g = db.query(UserGoal).filter(UserGoal.user_id == user.id).first()
    if not g:
        g = UserGoal(user_id=user.id)
        db.add(g)
        db.commit()
        db.refresh(g)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "status": "ok",
        "token": access_token,
        "user_name": user.full_name,
        "user_id": user.id,
        "email": user.email,
        "avatar": user.avatar_url,
        "totp_enabled": user.totp_enabled,
        "subscription_status": "beta",
        "settings": {
            "target": g.target_amount,
            "dailyLoss": g.daily_loss_limit,
            "strategy": user.strategy_description,
        },
    }


# ── Güvenli Çıkış (Token Blacklist) ─────────────────────────────────────────

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GÜVENLİK: Token'ı blacklist'e al (sunucu tarafında anında geçersiz kıl).
    Frontend Authorization header'ından token okunur.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = decode_token_payload(token)
    jti = payload.get("jti")
    exp = payload.get("exp")

    if jti and exp:
        from security import revoke_token
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        revoke_token(jti, expires_at, db)

    return {"status": "ok", "msg": "Oturum başarıyla sonlandırıldı."}


# ── 2FA Yönetimi ─────────────────────────────────────────────────────────────

@router.post("/2fa/setup")
def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı için TOTP sırrı üretir.
    QR URI'si döner → frontend bunu QR koda çevirir.
    Bu endpoint'ten sonra /2fa/enable çağrılmadan 2FA aktif olmaz.
    """
    from security import generate_totp_secret, get_totp_provisioning_uri, encrypt_field
    secret = generate_totp_secret()
    # Sırrı AES-256 ile şifrele, DB'ye kaydet (henüz aktif değil)
    current_user.totp_secret = encrypt_field(secret)
    current_user.totp_enabled = False
    db.commit()
    uri = get_totp_provisioning_uri(secret, current_user.email)
    return {
        "status": "ok",
        "provisioning_uri": uri,
        "msg": "QR kodu uygulamanızla tarayın, ardından /2fa/enable ile doğrulayın."
    }


@router.post("/2fa/enable")
def enable_2fa(
    body: TotpVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının uygulamasından gelen kodu doğrulayarak 2FA'yı aktif eder.
    """
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Önce /2fa/setup çağrılmalıdır.")
    from security import verify_totp, decrypt_field
    secret = decrypt_field(current_user.totp_secret)
    if not verify_totp(secret, body.totp_code):
        raise HTTPException(status_code=400, detail="Geçersiz kod. Lütfen tekrar deneyin.")
    current_user.totp_enabled = True
    db.commit()
    return {"status": "ok", "msg": "İki faktörlü doğrulama başarıyla etkinleştirildi!"}


@router.post("/2fa/disable")
def disable_2fa(
    body: TotpVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mevcut TOTP kodu doğrulayarak 2FA'yı devre dışı bırakır."""
    if not current_user.totp_enabled or not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA zaten devre dışı.")
    from security import verify_totp, decrypt_field
    secret = decrypt_field(current_user.totp_secret)
    if not verify_totp(secret, body.totp_code):
        raise HTTPException(status_code=400, detail="Geçersiz kod.")
    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return {"status": "ok", "msg": "2FA devre dışı bırakıldı."}


# ── Şifre Kurtarma ──────────────────────────────────────────────────────────

_ENUMERATION_SAFE_RESPONSE = {"message": "If that email is in our system, we have sent a verification code."}

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return _ENUMERATION_SAFE_RESPONSE

    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    db.query(OTPCode).filter(OTPCode.user_id == user.id).delete()
    db.add(
        OTPCode(
            user_id=user.id,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()
    _logger.info("[Auth] Password reset OTP created — user_id=%s", user.id)

    result = await send_otp_email(user.email, code)
    if not result.get("success"):
        _logger.error("[Auth] Password reset email failed: %s", result.get("error"))
        raise HTTPException(status_code=500, detail="E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.")

    return _ENUMERATION_SAFE_RESPONSE


# ── Google OAuth ─────────────────────────────────────────────────────────────

class GoogleAuthRequest(BaseModel):
    access_token: str

@router.post("/google-auth")
async def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    info = resp.json()
    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google response")
    # GÜVENLİK: Google tarafından doğrulanmamış e-postalarla giriş engellenir
    if not info.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Google e-postası doğrulanmamış.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Beta kullanıcı limiti
        if db.query(User).count() >= BETA_MAX_USERS:
            raise HTTPException(status_code=403, detail="Beta kontenjanı doldu.")

        user = User(
            email=email,
            hashed_password="",
            full_name=info.get("name", email.split("@")[0]),
            avatar_url=info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(UserGoal(user_id=user.id))
        db.commit()

    g = db.query(UserGoal).filter(UserGoal.user_id == user.id).first()
    if not g:
        g = UserGoal(user_id=user.id)
        db.add(g)
        db.commit()
        db.refresh(g)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "status": "ok",
        "token": access_token,
        "user_name": user.full_name,
        "user_id": user.id,
        "email": user.email,
        "avatar": user.avatar_url,
        "totp_enabled": user.totp_enabled or False,
        "settings": {
            "target": float(g.target_amount) if g.target_amount else 10000,
            "dailyLoss": float(g.daily_loss_limit) if g.daily_loss_limit else 500,
            "strategy": user.strategy_description,
        },
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, body: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı.")

    record = (
        db.query(OTPCode)
        .filter(OTPCode.user_id == user.id, OTPCode.code == body.otp_code)
        .first()
    )
    if not record:
        raise HTTPException(status_code=401, detail="Geçersiz doğrulama kodu.")

    if record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=401, detail="Doğrulama kodunun süresi dolmuş.")

    user.hashed_password = hash_password(body.new_password)
    db.delete(record)
    db.commit()
    _logger.info("[Auth] Password reset successful — user_id=%s", user.id)
    return {"success": True, "message": "Password successfully reset."}