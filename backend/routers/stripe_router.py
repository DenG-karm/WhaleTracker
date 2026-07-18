"""
stripe_router.py
────────────────
POST /api/v1/create-checkout-session   → Stripe Checkout oturumu oluşturur
POST /api/v1/stripe-webhook            → Stripe event'lerini işler

Gerekli .env değişkenleri:
  STRIPE_SECRET_KEY      sk_test_...  (veya sk_live_... canlıda)
  STRIPE_WEBHOOK_SECRET  whsec_...
  STRIPE_PRICE_ID        price_...    (Stripe Dashboard'dan aylık fiyat ID'si)
  FRONTEND_URL           https://YOUR_DOMAIN.com
"""
from __future__ import annotations

import os
import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Stripe yapılandırması ──────────────────────────────────────────────────
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
_PRICE_ID       = os.getenv("STRIPE_PRICE_ID", "")
_FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── POST /api/v1/create-checkout-session ──────────────────────────────────
@router.post("/api/v1/create-checkout-session")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("[Stripe] Checkout session isteği — user_id=%s email=%s mevcut_status=%s",
                current_user.id, current_user.email, current_user.subscription_status)

    if current_user.subscription_status == "pro":
        logger.warning("[Stripe] Kullanıcı zaten Pro — user_id=%s", current_user.id)
        raise HTTPException(status_code=400, detail="Zaten Pro abonesin.")

    if not stripe.api_key:
        logger.error("[Stripe] STRIPE_SECRET_KEY tanımlı değil!")
        return JSONResponse(status_code=400, content={"detail": "Ödeme sistemi yapılandırılmamış. (STRIPE_SECRET_KEY eksik)"})

    if not _PRICE_ID:
        logger.error("[Stripe] STRIPE_PRICE_ID tanımlı değil!")
        return JSONResponse(status_code=400, content={"detail": "Ödeme sistemi yapılandırılmamış. (STRIPE_PRICE_ID eksik)"})

    logger.debug("[Stripe] Kullanılacak PRICE_ID=%s  FRONTEND_URL=%s", _PRICE_ID, _FRONTEND_URL)

    try:
        # Stripe'ta daha önce müşteri kaydı yoksa oluştur
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            logger.info("[Stripe] Yeni Stripe müşterisi oluşturuluyor — email=%s", current_user.email)
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name or current_user.email,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()
            logger.info("[Stripe] Müşteri oluşturuldu — customer_id=%s", customer_id)
        else:
            logger.info("[Stripe] Mevcut müşteri kullanılıyor — customer_id=%s", customer_id)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": _PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url=f"{_FRONTEND_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{_FRONTEND_URL}/payment-cancel",
            metadata={"user_id": str(current_user.id)},
            subscription_data={
                "metadata": {"user_id": str(current_user.id)},
            },
            allow_promotion_codes=True,
        )

        logger.info("[Stripe] Checkout session oluşturuldu — session_id=%s  url=%s",
                    session.id, session.url)
        return {"checkout_url": session.url}

    except stripe.error.AuthenticationError as exc:
        logger.error("[Stripe] AuthenticationError — STRIPE_SECRET_KEY geçersiz mi? Hata: %s", exc)
        return JSONResponse(status_code=400, content={"detail": f"Stripe kimlik doğrulama hatası: {str(exc)}"})
    except stripe.error.InvalidRequestError as exc:
        logger.error("[Stripe] InvalidRequestError — PRICE_ID geçersiz mi? PRICE_ID=%s  Hata: %s", _PRICE_ID, exc)
        return JSONResponse(status_code=400, content={"detail": f"Stripe istek hatası: {str(exc)}"})
    except stripe.error.StripeError as exc:
        logger.error("[Stripe] StripeError: %s", exc)
        return JSONResponse(status_code=400, content={"detail": f"Stripe hatası: {str(exc)}"})
    except Exception as exc:
        logger.exception("[Stripe] Beklenmeyen hata — create_checkout_session: %s", exc)
        return JSONResponse(status_code=400, content={"detail": f"Sunucu hatası: {str(exc)}"})


# ── POST /api/v1/stripe-webhook ───────────────────────────────────────────
@router.post("/api/v1/stripe-webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Stripe imza doğrulama (HMAC-SHA256) — sahte event kabul edilmez.
    """
    if not _WEBHOOK_SECRET:
        logger.error("[Stripe] STRIPE_WEBHOOK_SECRET tanımlı değil.")
        raise HTTPException(status_code=503, detail="Webhook yapılandırılmamış.")

    raw_body = await request.body()
    logger.debug("[Stripe] Webhook alındı — body_len=%d  sig_header_mevcut=%s",
                 len(raw_body), bool(stripe_signature))

    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=stripe_signature or "",
            secret=_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("[Stripe] Geçersiz webhook imzası — istek reddedildi. "
                       "sig_header=%s  hata=%s", stripe_signature, exc)
        raise HTTPException(status_code=400, detail="Geçersiz imza.")
    except Exception as exc:
        logger.error("[Stripe] Webhook parse hatası: %s", exc)
        raise HTTPException(status_code=400, detail="Webhook parse hatası.")

    event_type = event["type"]
    event_id   = event.get("id", "?")
    data_obj   = event["data"]["object"]
    logger.info("[Stripe] Webhook event alındı — id=%s  type=%s", event_id, event_type)

    # ── checkout.session.completed — ödeme tamamlandı ──────────────────────
    if event_type == "checkout.session.completed":
        user_id     = data_obj.get("metadata", {}).get("user_id")
        customer_id = data_obj.get("customer")
        sub_id      = data_obj.get("subscription")
        logger.info("[Stripe] checkout.session.completed — user_id=%s  customer_id=%s  sub_id=%s",
                    user_id, customer_id, sub_id)

        if not user_id:
            logger.warning("[Stripe] checkout.session.completed: metadata.user_id yok — event_id=%s", event_id)
            return JSONResponse({"status": "ignored"})

        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if not user:
                logger.error("[Stripe] checkout.session.completed: user_id=%s veritabanında bulunamadı!", user_id)
                return JSONResponse({"status": "user_not_found"})
            user.subscription_status    = "pro"
            user.stripe_customer_id     = customer_id or user.stripe_customer_id
            user.stripe_subscription_id = sub_id
            db.commit()
            logger.info("[Stripe] UserID=%s → PRO yapıldı.", user_id)
        except Exception as db_exc:
            db.rollback()
            logger.exception("[Stripe] DB hatası — checkout.session.completed user_id=%s: %s", user_id, db_exc)
            raise HTTPException(status_code=500, detail="Veritabanı yazma hatası.")

    # ── customer.subscription.deleted — abonelik iptal edildi ──────────────
    elif event_type == "customer.subscription.deleted":
        sub_id = data_obj.get("id")
        logger.info("[Stripe] customer.subscription.deleted — sub_id=%s", sub_id)
        if sub_id:
            try:
                user = db.query(User).filter(
                    User.stripe_subscription_id == sub_id
                ).first()
                if not user:
                    logger.warning("[Stripe] subscription.deleted: sub_id=%s için kullanıcı bulunamadı.", sub_id)
                else:
                    user.subscription_status    = "cancelled"
                    user.stripe_subscription_id = None
                    db.commit()
                    logger.info("[Stripe] SubID=%s → CANCELLED yapıldı — user_id=%s", sub_id, user.id)
            except Exception as db_exc:
                db.rollback()
                logger.exception("[Stripe] DB hatası — subscription.deleted sub_id=%s: %s", sub_id, db_exc)
                raise HTTPException(status_code=500, detail="Veritabanı yazma hatası.")

    # ── customer.subscription.updated — yenileme / ödeme başarısız ─────────
    elif event_type == "customer.subscription.updated":
        sub_id = data_obj.get("id")
        status = data_obj.get("status")          # active | past_due | unpaid | canceled
        logger.info("[Stripe] customer.subscription.updated — sub_id=%s  status=%s", sub_id, status)
        if sub_id and status:
            try:
                user = db.query(User).filter(
                    User.stripe_subscription_id == sub_id
                ).first()
                if not user:
                    logger.warning("[Stripe] subscription.updated: sub_id=%s için kullanıcı bulunamadı.", sub_id)
                else:
                    new_status = "pro" if status == "active" else "free"
                    user.subscription_status = new_status
                    db.commit()
                    logger.info("[Stripe] SubID=%s → status=%s (db_status=%s) — user_id=%s",
                                sub_id, status, new_status, user.id)
            except Exception as db_exc:
                db.rollback()
                logger.exception("[Stripe] DB hatası — subscription.updated sub_id=%s: %s", sub_id, db_exc)
                raise HTTPException(status_code=500, detail="Veritabanı yazma hatası.")

    else:
        logger.debug("[Stripe] İşlenmeyen event: %s", event_type)

    return JSONResponse({"status": "ok"})
