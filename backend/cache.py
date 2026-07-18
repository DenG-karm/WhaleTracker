"""
cache.py — Redis Cache Yardımcı Modülü
=======================================
Tüm Redis işlemleri buradan yönetilir.
Prefix sistemi: her namespace kendi key'lerini karıştırmaz.

Namespace'ler:
  wt:price:<symbol>     → Son canlı fiyat
  wt:whale:<id>         → Balina transferi detayı
  wt:watchlist:<uid>    → Kullanıcı izleme listesi
  wt:jwt_bl:<jti>       → JWT blacklist (ek güvenlik katmanı)
  wt:otp:<email>        → E-posta doğrulama OTP kodu (TTL=300s)
"""

import os
import json
import logging
import redis
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()

_logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# ── Bağlantı Havuzu (Connection Pool) ────────────────────────────────────────
# from_url sadece konfigürasyon oluşturur; gerçek bağlantı ilk kullanımda kurulur.
_pool = redis.ConnectionPool.from_url(
    REDIS_URL,
    max_connections=20,
    decode_responses=True,  # bytes yerine str döner
    socket_connect_timeout=3,
    socket_timeout=3,
    retry_on_timeout=False,
)


def get_redis() -> redis.Redis:
    """Her çağrıda pool'dan bir bağlantı alır (threadsafe)."""
    return redis.Redis(connection_pool=_pool)


# ── Temel CRUD ────────────────────────────────────────────────────────────────

def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """
    Değeri JSON olarak Redis'e yazar.
    ttl_seconds=0 ise süresiz saklar.
    Redis erişilemezse sessizce devam eder (graceful degradation).
    """
    try:
        r = get_redis()
        serialized = json.dumps(value, default=str)
        if ttl_seconds > 0:
            r.setex(key, ttl_seconds, serialized)
        else:
            r.set(key, serialized)
    except redis.RedisError as exc:
        _logger.warning("cache_set başarısız (key=%s): %s", key, exc)


def cache_get(key: str) -> Optional[Any]:
    """Key varsa JSON parse edilmiş değeri döner, yoksa None.
    Redis erişilemezse None döner (graceful degradation)."""
    try:
        r = get_redis()
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except redis.RedisError as exc:
        _logger.warning("cache_get başarısız (key=%s): %s", key, exc)
        return None


def cache_delete(key: str) -> None:
    try:
        get_redis().delete(key)
    except redis.RedisError as exc:
        _logger.warning("cache_delete başarısız (key=%s): %s", key, exc)


def cache_delete_pattern(pattern: str) -> int:
    """Belirli prefix'teki tüm key'leri sil (örn: 'wt:watchlist:*')"""
    try:
        r = get_redis()
        keys = r.keys(pattern)
        if keys:
            return r.delete(*keys)
        return 0
    except redis.RedisError as exc:
        _logger.warning("cache_delete_pattern başarısız (pattern=%s): %s", pattern, exc)
        return 0


# ── OTP Yönetimi (Redis TTL tabanlı) ─────────────────────────────────────────

_OTP_PREFIX = "wt:otp:"
_OTP_TTL_SECONDS = 300  # 5 dakika


def otp_set(email: str, code: str) -> bool:
    """OTP kodunu Redis'e 5 dakikalık TTL ile kaydeder. Başarısızsa False döner."""
    try:
        get_redis().setex(f"{_OTP_PREFIX}{email}", _OTP_TTL_SECONDS, code)
        return True
    except redis.RedisError as exc:
        _logger.error("otp_set başarısız (email=%s): %s", email, exc)
        return False


def otp_verify_and_delete(email: str, code: str) -> bool:
    """Kodu doğrular ve geçerliyse siler. Geçersiz/süresi dolmuş/Redis hatası → False."""
    try:
        r = get_redis()
        key = f"{_OTP_PREFIX}{email}"
        stored = r.get(key)
        if stored is None or stored != code:
            return False
        r.delete(key)
        return True
    except redis.RedisError as exc:
        _logger.error("otp_verify başarısız (email=%s): %s", email, exc)
        return False


def otp_check(email: str, code: str) -> bool:
    """Kodu doğrular ama silmez (sadece kontrol için). Redis hatası → False."""
    try:
        r = get_redis()
        stored = r.get(f"{_OTP_PREFIX}{email}")
        return stored is not None and stored == code
    except redis.RedisError as exc:
        _logger.error("otp_check başarısız (email=%s): %s", email, exc)
        return False


# ── Pub/Sub (WebSocket Broadcast için) ───────────────────────────────────────

WHALE_CHANNEL = "wt:channel:whale_alerts"
PRICE_CHANNEL = "wt:channel:live_prices"


def publish(channel: str, message: Any) -> None:
    """Redis pub/sub kanalına mesaj yayınlar."""
    try:
        get_redis().publish(channel, json.dumps(message, default=str))
    except redis.RedisError as exc:
        _logger.warning("publish başarısız (channel=%s): %s", channel, exc)


def get_pubsub():
    """Yeni bir pub/sub nesnesi döner (abone olmak için kullan)."""
    return get_redis().pubsub()


# ── Özel Yardımcılar ──────────────────────────────────────────────────────────

def cache_price(symbol: str, data: dict, ttl: int = 5) -> None:
    """Canlı fiyatı 5 saniyeliğine cache'e yazar."""
    cache_set(f"wt:price:{symbol.upper()}", data, ttl)


def get_cached_price(symbol: str) -> Optional[dict]:
    return cache_get(f"wt:price:{symbol.upper()}")


def cache_watchlist(user_id: int, data: list, ttl: int = 120) -> None:
    """İzleme listesini 2 dakikalığına cache'e yazar."""
    cache_set(f"wt:watchlist:{user_id}", data, ttl)


def get_cached_watchlist(user_id: int) -> Optional[list]:
    return cache_get(f"wt:watchlist:{user_id}")


def invalidate_watchlist(user_id: int) -> None:
    """İzleme listesi değiştiğinde cache'i temizle."""
    cache_delete(f"wt:watchlist:{user_id}")


def is_redis_healthy() -> bool:
    """Health check endpoint'i için Redis'e ping atar."""
    try:
        return get_redis().ping()
    except Exception:
        return False
