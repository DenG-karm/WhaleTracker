"""
proxy_router.py — Yahoo Finance & Binance CORS Proxy
Tarayıcıdan Yahoo/Binance'a doğrudan erişim CORS tarafından engelleniyor.
Bu router isteği backend üzerinden proxylendirerek CORS sorununu ortadan kaldırır.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import httpx
import urllib.parse
import asyncio
import logging

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proxy", tags=["proxy"])

YAHOO_BASE     = "https://query1.finance.yahoo.com"
YAHOO_BASE_ALT = "https://query2.finance.yahoo.com"
TIMEOUT        = 12.0

_MAX_RETRIES  = 3
_BACKOFF_BASE = 0.5  # seconds

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://finance.yahoo.com/",
    "Origin":          "https://finance.yahoo.com",
}


async def _yahoo_get(path: str, params: dict) -> dict:
    """Yahoo Finance'e GET isteği atar, query1 → query2 fallback ve exponential backoff retry içerir."""
    for base in (YAHOO_BASE, YAHOO_BASE_ALT):
        url = f"{base}{path}"
        for attempt in range(_MAX_RETRIES):
            try:
                async with httpx.AsyncClient(
                    headers=HEADERS, timeout=TIMEOUT, follow_redirects=True
                ) as client:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        return resp.json()
                    _logger.warning(
                        "[Yahoo] %s HTTP %s (attempt %d/%d)",
                        url, resp.status_code, attempt + 1, _MAX_RETRIES,
                    )
            except (httpx.TimeoutException, httpx.RequestError) as exc:
                _logger.warning(
                    "[Yahoo] %s → %s (attempt %d/%d)",
                    url, exc, attempt + 1, _MAX_RETRIES,
                )
            if attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(_BACKOFF_BASE * (2 ** attempt))
    raise HTTPException(status_code=502, detail="Yahoo Finance proxy zaman aşımına uğradı.")


# ── /api/proxy/yahoo/chart/{symbol} ──────────────────────────────────────────
@router.get("/yahoo/chart/{symbol}")
async def yahoo_chart(
    symbol:         str,
    interval:       str = Query("1d"),
    range:          str = Query("6mo"),
    includePrePost: str = Query("false"),
    period1:        str = Query(None),
    period2:        str = Query(None),
):
    """
    Yahoo Finance chart verisi CORS-safe proxy.
    Kripto (Binance) harici tüm hisse senedi sembolleri bu endpoint üzerinden çekilir.
    """
    params: dict = {
        "interval":       interval,
        "includePrePost": includePrePost,
    }
    if period1 and period2:
        params["period1"] = period1
        params["period2"] = period2
    else:
        params["range"] = range

    data = await _yahoo_get(f"/v8/finance/chart/{urllib.parse.quote(symbol)}", params)
    return JSONResponse(content=data)


# ── /api/proxy/yahoo/search ───────────────────────────────────────────────────
@router.get("/yahoo/search")
async def yahoo_search(
    q:           str = Query(..., min_length=1, max_length=50),
    newsCount:   int = Query(0),
    quotesCount: int = Query(8),
):
    """
    Yahoo Finance sembol arama CORS-safe proxy.
    Kullanıcı girişini uzunluk/karakter kontrolünden geçirir.
    """
    params = {
        "q":           q[:50],          # Input truncation — güvenlik
        "newsCount":   newsCount,
        "quotesCount": min(quotesCount, 20),
    }
    data = await _yahoo_get("/v1/finance/search", params)
    return JSONResponse(content=data)


# ── /api/proxy/binance/klines ─────────────────────────────────────────────────
BINANCE_BASE = "https://api.binance.com"

ALLOWED_BINANCE_INTERVALS = {
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1d", "3d", "1w", "1M",
}
ALLOWED_BINANCE_SYMBOLS_PATTERN = r"^[A-Z0-9]{2,20}$"
import re

@router.get("/binance/klines")
async def binance_klines(
    symbol:    str           = Query(..., min_length=2, max_length=20),
    interval:  str           = Query("1h"),
    limit:     int           = Query(500, ge=1, le=1000),
    endTime:   Optional[int] = Query(None, description="Unix ms — bu zamandan geriye doğru limit kadar mum döner"),
    startTime: Optional[int] = Query(None, description="Unix ms — bu zamandan ileri doğru limit kadar mum döner"),
):
    """
    Binance klines (OHLCV) CORS-safe proxy.
    Lazy load için endTime + limit parametresiyle geçmiş blok çekmeyi destekler.
    Replay için startTime + limit parametresiyle ileri blok çekmeyi destekler.
    limit max 1000 ile sınırlıdır (Binance limiti aşılmaz).
    """
    # Input validation
    if not re.match(r"^[A-Z0-9]{2,20}$", symbol.upper()):
        raise HTTPException(status_code=400, detail="Geçersiz sembol formatı.")
    if interval not in ALLOWED_BINANCE_INTERVALS:
        raise HTTPException(status_code=400, detail="Geçersiz interval değeri.")

    params: dict = {
        "symbol":   symbol.upper(),
        "interval": interval,
        "limit":    limit,
    }
    if startTime is not None:
        if startTime <= 0:
            raise HTTPException(status_code=400, detail="Geçersiz startTime.")
        params["startTime"] = startTime
    if endTime is not None:
        if endTime <= 0:
            raise HTTPException(status_code=400, detail="Geçersiz endTime.")
        params["endTime"] = endTime

    url = f"{BINANCE_BASE}/api/v3/klines"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Binance API hatası.")
            return JSONResponse(content=resp.json())
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Binance API zaman aşımı.")
