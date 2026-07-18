from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, Response
import asyncio
import json
import logging
import re
import traceback
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from auth import limiter

load_dotenv()

from database import engine
from models import Base
from routers import auth_router, trades_router, users_router, ai_router, news_router, ws_router, profile_router, watchlist_router, whale_router, analytics_router
from routers.api_keys_router import router as api_keys_router
from routers.proxy_router import router as proxy_router
from routers.psych_analytics_router import router as psych_analytics_router
from routers.stripe_router import router as stripe_router
from routers.mobile_router import router as mobile_router
from routers.chat_router import router as chat_router

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

_logger = logging.getLogger(__name__)

async def autonomous_radar_loop():
    _logger.info("[RADAR] Otonom arkaplan trayıcısı başlatıldı.")
    import os
    import google.genai as genai
    from cache import cache_get
    from routers.ws_router import radar_manager
    from database import SessionLocal
    from models import TradeLog
    import random
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        _logger.warning("[RADAR] GEMINI_API_KEY bulunamadı. Otonom tarama devre dışı.")
        return
        
    _radar_client = genai.Client(api_key=api_key)
    
    while True:
        await asyncio.sleep(60) # Her 1 dakikada bir tarama
        
        try:
            # Gerçek haberlerden breaking/yüksek impact olanları al (CryptoPanic cache)
            cached_news = cache_get("wt:news:feed") or []
            breaking_news = [n for n in cached_news if n.get("is_breaking") and n.get("ai_impact_score", 0) >= 70]
            if not breaking_news:
                breaking_news = [n for n in cached_news if n.get("ai_impact_score", 0) >= 85]
            if not breaking_news:
                continue
                
            shock = random.choice(breaking_news)
            
            db = SessionLocal()
            open_trades = db.query(TradeLog).filter(TradeLog.status == "OPEN").all()
            
            if not open_trades:
                db.close()
                continue
                
            _logger.info("[RADAR] Otonom Tarama: %d açık pozisyon analiz ediliyor… haber=%s",
                         len(open_trades), shock.get('title'))
            
            for trade in open_trades:
                prompt = f"""
Kullanıcının şu an {trade.symbol} paritesinde {trade.trade_type} işlemi var. Giriş fiyatı: {trade.entry_price}.
Piyasaya şu acil haber düştü: "{shock.get('title')}".
Bu haber kullanıcının pozisyonu için TEHLİKELİ Mİ (Riskli)?
Sadece geçerli bir JSON formatında dön: {{"is_risk": true/false, "alert_message": "1 cümlelik acil eylem tavsiyesi"}}
Lütfen sadece JSON dön, etrafında markdown bloğu (```) olmasın.
                """
                
                try:
                    response = _radar_client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
                    res_text = response.text.strip()
                    if res_text.startswith("```json"): res_text = res_text[7:]
                    elif res_text.startswith("```"): res_text = res_text[3:]
                    if res_text.endswith("```"): res_text = res_text[:-3]
                    res_text = res_text.strip()
                    
                    analysis = json.loads(res_text)
                    if analysis.get("is_risk") is True:
                        _logger.info("[RADAR] Risk tespit edildi! UserID=%s %s", trade.user_id, analysis.get('alert_message'))
                        await radar_manager.send_to_user(trade.user_id, {
                            "type": "MACRO_ALERT",
                            "symbol": trade.symbol,
                            "trade_type": trade.trade_type,
                            "shock_title": shock.get('title'),
                            "source": shock.get('source', 'News'),
                            "message": analysis.get("alert_message", "Pozisyonunuz risk altında olabilir."),
                            "impact_score": shock.get("ai_impact_score", 0),
                        })
                except Exception as ai_e:
                    _logger.error("[RADAR] AI Hatası (TradeID %s): %s", trade.id, ai_e)
                    continue
                    
            db.close()
        except Exception as e:
            _logger.error("[RADAR] Döngü Hatası: %s", traceback.format_exc())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama yaşam döngüsü — startup ve shutdown işlemleri."""
    # ── STARTUP ──────────────────────────────────────────────────────────────
    print("[Startup] Uygulama başlatılıyor...", flush=True)
    from database import SessionLocal
    from security import load_revoked_tokens_from_db

    try:
        Base.metadata.create_all(bind=engine)
        print("[Startup] DB tabloları kontrol edildi.", flush=True)
    except Exception as exc:
        print(f"[Startup] create_all hatası: {exc}", flush=True)

    asyncio.create_task(autonomous_radar_loop())

    db = SessionLocal()
    try:
        load_revoked_tokens_from_db(db)
    except Exception as exc:
        print(f"[Startup] Revoked token yüklenemedi: {exc}", flush=True)
    finally:
        db.close()

    print("[Startup] Hazır! lifespan aktif, CORS çalışıyor.", flush=True)

    yield  # uygulama burada çalışır

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    print("[Shutdown] Uygulama kapatılıyor.", flush=True)


app = FastAPI(
    title="Whaletracker API",
    version="1.0.0",
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
    lifespan=lifespan,
)

# 3. GÜVENLİK: Brute Force ve DDOS Koruması (Rate Limiting)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. PERFORMANS: GZip sıkıştırma — 1 KB üstü yanıtları sıkıştırır
app.add_middleware(GZipMiddleware, minimum_size=1024)

# 2. GÜVENLİK: Güvenlik Başlıkları + X-Request-ID izleme
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Request-ID"] = request_id
    return response

# 1. GÜVENLİK: CORS — Manuel middleware (CORSMiddleware yerine, tam kontrol için)
_CORS_ORIGINS = frozenset([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://whaletracker-core.vercel.app",
    "https://whaletracker-core-denizgunarslan77-3982s-projects.vercel.app",
    "https://whaletrackerhq.com",
    "https://www.whaletrackerhq.com",
])
_CORS_ORIGIN_RE = re.compile(r"https://[a-zA-Z0-9-]+\.vercel\.app")
_logger.info("[CORS] İzin verilen origins: %s + *.vercel.app regex", _CORS_ORIGINS)


@app.middleware("http")
async def cors_handler(request: Request, call_next):
    origin = request.headers.get("origin", "")
    allowed = bool(origin) and (
        origin in _CORS_ORIGINS or bool(_CORS_ORIGIN_RE.fullmatch(origin))
    )

    # Preflight (OPTIONS) — call_next çağrılmaz, direkt yanıt döndür
    if request.method == "OPTIONS":
        resp = Response(status_code=200)
        if allowed:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            req_hdrs = request.headers.get("access-control-request-headers", "Authorization, Content-Type")
            resp.headers["Access-Control-Allow-Headers"] = req_hdrs
            resp.headers["Access-Control-Max-Age"] = "600"
        return resp

    response = await call_next(request)
    if allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response

# Upload klasörü
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Router'ları ekle
app.include_router(auth_router.router)
app.include_router(trades_router.router)
app.include_router(users_router.router)
app.include_router(ai_router.router)
app.include_router(news_router.router)
app.include_router(ws_router.router)
app.include_router(profile_router.router)
app.include_router(watchlist_router.router)
app.include_router(whale_router.router)
app.include_router(analytics_router.router)
app.include_router(api_keys_router)
app.include_router(proxy_router)
app.include_router(psych_analytics_router)
app.include_router(stripe_router)
app.include_router(mobile_router)
app.include_router(chat_router, prefix="/chat", tags=["Chat"])


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)