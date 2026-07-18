from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import List, Literal
import asyncio
import time
import logging
import yfinance as yf

from database import get_db
from models import User, WatchlistItem
from auth import get_current_user
from cache import get_cached_watchlist, cache_watchlist, invalidate_watchlist

_logger = logging.getLogger(__name__)
_YF_MAX_RETRIES  = 3
_YF_BACKOFF_BASE = 0.5  # seconds

router = APIRouter()

# ── Kripto sembol tanıma ─────────────────────────────────────────────────────
_CRYPTO_SUFFIXES = ("USDT", "BTC", "ETH", "BNB", "BUSD", "USDC", "DAI", "SOL")
_KNOWN_CRYPTO_BASES = {
    "BTC", "ETH", "BNB", "SOL", "ADA", "DOT", "AVAX", "LINK",
    "DOGE", "XRP", "LTC", "MATIC", "UNI", "ATOM", "NEAR",
    "FTM", "ALGO", "ICP", "ETC", "FIL", "VET", "HBAR",
}

# ── BİST (Borsa İstanbul) sembolleri — Yahoo Finance'te ".IS" suffix'i gerektirir ──
_BIST_SYMBOLS = {
    # Büyük Cap / Endeks
    "AKBNK","GARAN","HALKB","ISCTR","VAKBN","YKBNK","KCHOL","SAHOL",
    "SISE","TCELL","TOASO","THYAO","ARCLK","ASELS","BIMAS","EKGYO",
    "ENKAI","EREGL","FROTO","MGROS","PETKM","PGSUS","KOZAL","SASA",
    "GUBRF","OYAKC","TAVHL","TKFEN","TSKB","TUPRS","VESTL","LOGO",
    "DOHOL","HEKTS","OTKAR","SOKM","ULKER","CCOLA","AEFES","ALARK",
    "ALCTL","ANACM","ASUZU","BAGFS","BANVT","BRISA","BUCIM","CIMSA",
    "DOAS","EGEEN","GOLTS","KLNMA","KONYA","KORDS","KRDMD","MAVI",
    "NTTUR","ODAS","PARSN","POLHO","RYSAS","SKBNK","SNPAM","SNGYO",
    "TATGD","TKNSA","TMSN","TRCAS","TRETN","TTRAK","TTKOM","VKFYO",
    "ZOREN","AGHOL","AKSA","AKSEN","ALFAS","ARDYZ","ARSAN","ARZUM",
    "ASTOR","ATLAS","AYGAZ","BAYRK","BERA","BFREN","BIOEN","BJKAS",
    "BORSK","BTCIM","BTEK","BURCE","BURVA","CANTE","DENGE","DEVA",
    "DITAS","DYOBY","ECZYT","EDIP","EKSUN","EMKEL","ENJSA","EPLAS",
    "ERBOS","ERSU","ESCAR","ESCOM","ESEN","ETILR","EUPWR","FLAP",
    "FONET","FORTE","FRIGO","GEDZA","GEREL","GLYHO","GMTAS","GRSEL",
    "GSDDE","GSDHO","GSRAY","HATEK","HTTBT","HUNER","HURGZ","ICBCT",
    "IDGYO","IEYHO","IHEVA","IHGZT","IHLAS","IHLGM","IHYAY","INDES",
    "INFO","INVEO","IPEKE","ISATR","ISBTR","ISDMR","ISYAT","ITTFK",
    "IZFAS","IZOCM","JANTS","KAREL","KARTN","KATMR","KAYSE","KENT",
    "KERVN","KERVT","KLKIM","KNFRT","KONTR","KOPOL","KRONT","KRSAN",
    "KTLEV","KUYAS","LKMNH","LUKSK","MAALT","MACKO","MAGEN","MARTI",
    "MEDTR","MEGAP","MEKAG","METEM","METUR","MIPAZ","MOGAN","MPARK",
    "MRDIN","MRGYO","MSGYO","MZHLD","NATEN","NETAS","NIBAS","NUHCM",
    "OBASE","ODINE","OFSYM","ONCSM","ORCAY","ORGE","ORMA","OSMEN",
    "OSTIM","OYLUM","OZGYO","PAGYO","PEGYO","PENGD","PENTA","PETUN",
    "PINSU","PKART","PNLSN","POLTK","PRZMA","PSGYO","QNBFB","QNBFL",
    "RAYSG","REEDR","RGYAS","RNPOL","RUBNS","RYGYO","SAFKR","SANFM",
    "SANKO","SAYAS","SEGYO","SEKFK","SEKUR","SELEC","SELVA","SEYKM",
    "SILVR","SNICA","SODSN","SRVGY","SUMAS","SUNTK","SURGY","SUWEN",
    "TACTR","TALGO","TCRET","TCZOB","TDGYO","TEKTU","TETMT","TGSAS",
    "TNZTP","TRGYO","TRILC","TSGYO","TUGVA","TUKAS","TUREX","TURGG",
    "TURSG","UGUR","ULUUN","ULUSE","UMPAS","UNLU","USAK","UTPYA",
    "VANGD","VERTU","VERUS","VKGYO","VKING","YAPRK","YATAS","YBTAS",
    "YESIL","YGYO","YKSLN","YUNSA","ZEDUR","ZRGYO","INGRM","INTEM",
}


def normalize_symbol(symbol: str) -> tuple[str, str]:
    """
    Sembolü normalleştirir ve varlık tipini döner → (normalized_symbol, asset_type)

    Örnekler:
        "THYAO"    → ("THYAO.IS",  "stock")   # BİST → .IS eklendi
        "THYAO.IS" → ("THYAO.IS",  "stock")   # zaten normalize
        "AAPL"     → ("AAPL",      "stock")   # US hissesi
        "BTCUSDT"  → ("BTCUSDT",   "crypto")
        "BTC"      → ("BTC",       "crypto")
    """
    s = symbol.upper().strip()

    # Zaten .IS suffix'i var → BİST hissesi
    if s.endswith(".IS"):
        return s, "stock"

    # Kripto suffix tespiti
    if any(s.endswith(sfx) for sfx in _CRYPTO_SUFFIXES):
        return s, "crypto"

    # Bilinen BİST sembolü → .IS ekle
    if s in _BIST_SYMBOLS:
        return f"{s}.IS", "stock"

    # Bilinen kripto baz sembolü
    if s in _KNOWN_CRYPTO_BASES:
        return s, "crypto"

    # Varsayılan: US hissesi
    return s, "stock"


def detect_asset_type(symbol: str) -> Literal["crypto", "stock"]:
    """Geriye dönük uyumluluk için korundu."""
    _, asset_type = normalize_symbol(symbol)
    return asset_type



class WatchlistSymbol(BaseModel):
    symbol: str
    asset_type: Literal["crypto", "stock"] | None = None  # opsiyonel: verilmezse otomatik tespit

    @field_validator("symbol")
    @classmethod
    def clean_symbol(cls, v: str) -> str:
        return v.upper().strip()


class WatchlistItemResponse(BaseModel):
    id: int
    symbol: str
    asset_type: str

    class Config:
        from_attributes = True


@router.get("/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cached_data = get_cached_watchlist(current_user.id)
    if cached_data:
        return cached_data

    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).order_by(WatchlistItem.id).all()
    cache_data = [{"id": item.id, "symbol": item.symbol, "asset_type": item.asset_type} for item in items]
    cache_watchlist(current_user.id, cache_data)
    return items


@router.post("/watchlist", response_model=WatchlistItemResponse)
def add_to_watchlist(
    item: WatchlistSymbol,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_symbol = item.symbol  # already uppercased by validator
    # Backend normalize eder: THYAO → THYAO.IS, AAPL → AAPL
    normalized, auto_type = normalize_symbol(raw_symbol)
    asset_type = item.asset_type or auto_type

    existing_item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.symbol == normalized
    ).first()
    if existing_item:
        raise HTTPException(status_code=409, detail="Symbol already in watchlist")

    db_item = WatchlistItem(user_id=current_user.id, symbol=normalized, asset_type=asset_type)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    invalidate_watchlist(current_user.id)
    return db_item


@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item_to_delete = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.symbol == symbol.upper()
    ).first()
    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Symbol not found in watchlist")

    db.delete(item_to_delete)
    db.commit()
    invalidate_watchlist(current_user.id)
    return {"status": "ok", "message": "Symbol removed from watchlist"}


# ── yfinance fiyat servisi ────────────────────────────────────────────────────
# CORS sorununu aşmak için frontend bu endpoint'i kullanır.
# ABD hisseleri (AAPL, TSLA) ve BİST hisseleri (THYAO.IS) desteklenir.
# yfinance senkron kütüphanesidir; asyncio.to_thread ile event loop bloke edilmez.

def _fetch_yfinance_sync(symbol: str) -> dict:
    """
    Tek sembol için yfinance verisi çeker. Thread-pool'da çalışır.
    fast_info: regularMarketPrice, previousClose, currency, exchange, volume.
    Exponential backoff ile _YF_MAX_RETRIES kadar yeniden dener.
    """
    last_exc: Exception | None = None
    for attempt in range(_YF_MAX_RETRIES):
        try:
            ticker = yf.Ticker(symbol)
            fi = ticker.fast_info
            price = fi.last_price
            prev_close = fi.previous_close

            if not price or not prev_close or prev_close == 0:
                return {"symbol": symbol, "error": "Fiyat verisi alınamadı"}

            change_pct = ((price - prev_close) / prev_close) * 100
            volume = getattr(fi, "three_month_average_volume", None) or getattr(fi, "regular_market_volume", None)
            return {
                "symbol":    symbol,
                "price":     round(float(price), 4),
                "change":    f"{change_pct:+.2f}",
                "changeAbs": round(float(price - prev_close), 4),
                "isUp":      change_pct >= 0,
                "volume":    int(volume) if volume else None,
                "currency":  getattr(fi, "currency", "USD") or "USD",
                "exchange":  getattr(fi, "exchange", None),
                "source":    "yfinance",
            }
        except Exception as exc:
            last_exc = exc
            _logger.warning(
                "[yfinance] %s → %s (attempt %d/%d)",
                symbol, exc, attempt + 1, _YF_MAX_RETRIES,
            )
            if attempt < _YF_MAX_RETRIES - 1:
                time.sleep(_YF_BACKOFF_BASE * (2 ** attempt))
    return {"symbol": symbol, "error": str(last_exc)}


@router.get("/market/prices")
async def get_stock_prices(symbols: str, current_user: User = Depends(get_current_user)):
    """
    yfinance üzerinden gerçek zamanlı fiyat verileri döner.
    ABD hisseleri (AAPL, TSLA, AMZN) ve BİST hisseleri (THYAO.IS, ISCTR.IS) desteklenir.
    symbols: virgülle ayrılmış sembol listesi (max 20)
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail="symbols parametresi boş olamaz")
    if len(symbol_list) > 20:
        raise HTTPException(status_code=400, detail="En fazla 20 sembol sorgulanabilir")

    results_list = await asyncio.gather(
        *[asyncio.to_thread(_fetch_yfinance_sync, sym) for sym in symbol_list]
    )
    return {r["symbol"]: r for r in results_list}
