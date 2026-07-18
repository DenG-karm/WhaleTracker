"""
routers/news_router.py — Global Finans Haber & Radar Akışı
============================================================
Veri Kaynakları (API Key gerekmez):
  1. Yahoo Finance RSS  → Hisse senedi haberleri
  2. Google News RSS    → Kripto / Makro / FX haberleri
  3. BBC Business RSS   → Makro ekonomi
  4. CoinTelegraph RSS  → Kripto haberleri
  5. Gemini AI          → Sentiment analizi + impact score + özet

Desteklenen kategoriler: ALL · CRYPTO · STOCKS · MACRO · FX
Cache Stratejisi: Kategori bazlı, 15 dakikada bir yenilenir (Redis TTL=900s).
"""

from fastapi import APIRouter, Depends, Query
import httpx
import os
import json
import logging
import asyncio
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime as _parse_rfc_date
from urllib.parse import urlparse as _urlparse
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from pydantic import BaseModel
import traceback
import google.genai as genai
from database import get_db
from models import User, WatchlistItem, TradeLog
from auth import get_current_user
from cache import cache_get, cache_set

router = APIRouter()
_logger = logging.getLogger(__name__)

# ── Sabitler ─────────────────────────────────────────────────────────────────

NEWS_CACHE_TTL = 900  # 15 dakika

# RSS haber kaynakları — API key gerekmez, tamamen ücretsiz
RSS_FEEDS: dict[str, list[str]] = {
    "CRYPTO": [
        "https://cointelegraph.com/rss",
        "https://news.google.com/rss/search?q=cryptocurrency+bitcoin+ethereum+defi&hl=en&gl=US&ceid=US:en",
    ],
    "STOCKS": [
        "https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,TSLA,NVDA,MSFT,AMZN,GOOGL,META&region=US&lang=en-US",
        "https://news.google.com/rss/search?q=stock+market+earnings+equities+NYSE+NASDAQ+shares&hl=en&gl=US&ceid=US:en",
    ],
    "MACRO": [
        "https://news.google.com/rss/search?q=federal+reserve+inflation+interest+rate+GDP+central+bank+economy&hl=en&gl=US&ceid=US:en",
        "https://feeds.bbci.co.uk/news/business/rss.xml",
    ],
    "FX": [
        "https://news.google.com/rss/search?q=forex+dollar+euro+currency+exchange+rate+EURUSD+GBPUSD+yen&hl=en&gl=US&ceid=US:en",
    ],
}

# Kategori kodu → görüntüleme etiketi
_CAT_LABEL: dict[str, str] = {
    "CRYPTO": "Kripto",
    "STOCKS": "Hisse",
    "MACRO":  "Makro",
    "FX":     "FX/Döviz",
}

CATEGORY_MAP = {
    "bitcoin": "Kripto", "ethereum": "Kripto", "crypto": "Kripto",
    "defi": "Kripto", "nft": "Kripto", "altcoin": "Kripto",
    "stock": "Hisse", "equity": "Hisse", "earnings": "Hisse",
    "gold": "Emtia", "oil": "Emtia", "commodity": "Emtia", "silver": "Emtia",
    "fed": "Makro", "inflation": "Makro", "gdp": "Makro", "cpi": "Makro",
    "interest rate": "Makro", "central bank": "Makro", "fomc": "Makro",
}

SYMBOL_KEYWORDS = {
    "BTCUSDT": ["bitcoin", "btc"],
    "ETHUSDT": ["ethereum", "eth"],
    "SOLUSDT": ["solana", "sol"],
    "XAUUSD":  ["gold", "altın", "xau"],
    "NVDA":    ["nvidia", "nvda", "ai chip"],
    "AAPL":    ["apple", "aapl"],
    "SPX500":  ["s&p", "spx", "sp500"],
    "USD":     ["fed", "fomc", "dollar", "dolar", "usd", "inflation", "enflasyon"],
    "EUR":     ["ecb", "euro", "eur", "europe", "avrupa"],
    "OIL":     ["oil", "petrol", "opec", "brent"],
}


def _detect_category(title: str, tags: list) -> str:
    """Başlık ve etiketlere bakarak haberin kategorisini tespit et."""
    text = (title + " " + " ".join(tags)).lower()
    for keyword, category in CATEGORY_MAP.items():
        if keyword in text:
            return category
    return "Makro"


def _detect_symbols(title: str) -> list[str]:
    """Başlığa bakarak ilgili sembolleri tespit et."""
    text = title.lower()
    found = []
    for symbol, keywords in SYMBOL_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            found.append(symbol)
    return found if found else ["USD"]


def _score_without_ai(title: str, source: str) -> dict:
    """
    AI API olmadığında kaynak güvenilirliği + başlık keyword'lerine göre
    geniş dağılımlı (20-98) skor ve sentiment üretir (deterministik).
    """
    src_lower = source.lower()
    TIER_1 = {'wsj', 'wall street journal', 'bloomberg', 'reuters', 'financial times',
              'ft.com', 'associated press', 'ap news', 'economist'}
    TIER_2 = {'cnbc', 'cnn', 'forbes', 'fortune', 'marketwatch', 'barron',
              'coindesk', 'techcrunch', 'yahoo finance', 'benzinga', 'seeking alpha', 'motley fool'}
    TIER_3 = {'cointelegraph', 'decrypt', 'theblock', 'businessinsider', 'bbc',
              'guardian', 'new york times', 'nytimes', 'axios'}

    if any(t in src_lower for t in TIER_1):
        base_min, base_max = 82, 98
    elif any(t in src_lower for t in TIER_2):
        base_min, base_max = 62, 84
    elif any(t in src_lower for t in TIER_3):
        base_min, base_max = 44, 68
    else:
        base_min, base_max = 22, 52

    # Deterministik seed: başlık karakterleri toplamı
    seed = sum(ord(c) for c in title[:40]) % 1000
    span = max(1, base_max - base_min)
    score = base_min + (seed % span)

    # Sentiment: keyword sayımı
    title_lower = title.lower()
    bull_words = ['rally', 'surge', 'rise', 'jump', 'gain', 'bull', 'recover',
                  'soar', 'boom', 'growth', 'record', 'strong', 'buy', 'high']
    bear_words = ['crash', 'fall', 'drop', 'plunge', 'bear', 'collapse',
                  'decline', 'loss', 'low', 'sink', 'fear', 'risk', 'warning', 'sell', 'dump']
    b_cnt = sum(1 for w in bull_words if w in title_lower)
    r_cnt = sum(1 for w in bear_words if w in title_lower)
    sentiment = "Bullish" if b_cnt > r_cnt else ("Bearish" if r_cnt > b_cnt else "Neutral")

    return {
        "sentiment": sentiment,
        "ai_impact_score": max(20, min(98, score)),
        "ai_summary": title,
    }


def _analyze_with_ai(title: str, source: str, lang: str = "tr") -> dict:
    """
    Gemini AI ile haber analizi yapar.
    Döner: {"sentiment": str, "ai_impact_score": int, "ai_summary": str}
    """
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return _score_without_ai(title, source)

        genai_client = genai.Client(api_key=api_key)

        if lang == "en":
            prompt = f"""
You are a professional Fintech news analyst. Analyze the following headline:
Title: "{title}"
Source: {source}

Return ONLY a JSON object (no explanation, no markdown):
{{"sentiment": "Bullish" or "Bearish" or "Neutral", "ai_impact_score": market impact score 0-100, "ai_summary": "1-2 sentence professional English summary and trading impact"}}
"""
        else:
            prompt = f"""
Sen bir Fintech haber analisti olarak aşağıdaki haber manşetini analiz et:
Başlık: "{title}"
Kaynak: {source}

Şu formatta JSON döndür (açıklama veya markdown yok, sadece JSON):
{{"sentiment": "Bullish" veya "Bearish" veya "Neutral", "ai_impact_score": 0-100 arası piyasa etki skoru, "ai_summary": "Türkçe 1-2 cümlelik profesyonel özet ve alım-satım etkisi", "title_tr": "Başlığın Türkçe çevirisi"}}
"""
        response = genai_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        result = json.loads(text)
        return {
            "sentiment": result.get("sentiment", "Neutral"),
            "ai_impact_score": max(0, min(100, int(result.get("ai_impact_score", 50)))),
            "ai_summary": result.get("ai_summary", title),
            "title_tr": result.get("title_tr", title),
        }
    except Exception:
        return _score_without_ai(title, source)


async def _parse_rss(url: str, default_category: str) -> list[dict]:
    """Bir RSS feed URL'sini fetch edip ham haber listesi döner."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 WhaleTracker/2.0"}
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
        root = ET.fromstring(resp.text)
        channel = root.find("channel") or root
        raw: list[dict] = []
        for item in channel.findall("item")[:15]:
            title  = (item.findtext("title")   or "").strip()
            link   = (item.findtext("link")    or "#").strip()
            pub    = (item.findtext("pubDate") or "").strip()
            src_el = item.find("source")
            src_text = src_el.text.strip() if (src_el is not None and src_el.text) else ""
            if not title:
                continue
            # Google News başlıklarında " - Kaynak Adı" soneki olur — temizle
            if " - " in title:
                clean_title = title.rsplit(" - ", 1)[0].strip()
                source_name = src_text or title.rsplit(" - ", 1)[-1].strip()
            else:
                clean_title = title
                source_name = src_text or _urlparse(url).netloc.replace("www.", "").replace("feeds.", "").split(".")[0].title()
            try:
                published_at = _parse_rfc_date(pub).isoformat() if pub else datetime.now(timezone.utc).isoformat()
            except Exception:
                published_at = datetime.now(timezone.utc).isoformat()
            is_breaking = any(w in clean_title.lower() for w in [
                "breaking", "urgent", "flash", "crash", "collapse", "emergency",
                "acil", "son dakika", "kriz",
            ])
            raw.append({
                "title": clean_title,
                "source": source_name,
                "url": link,
                "published_at": published_at,
                "is_breaking": is_breaking,
                "default_category": default_category,
            })
        return raw
    except Exception as e:
        _logger.warning("[RSS] %s: %s", url, e)
        return []


async def _fetch_category_news(filter_type: str, lang: str = "tr") -> list[dict]:
    """
    RSS feed'lerden paralel haber çeker, AI ile analiz eder.
    filter_type: 'ALL' | 'CRYPTO' | 'STOCKS' | 'MACRO' | 'FX'
    """
    categories = list(RSS_FEEDS.keys()) if filter_type == "ALL" else [filter_type]
    tasks = [
        _parse_rss(url, cat)
        for cat in categories
        for url in RSS_FEEDS.get(cat, [])
    ]
    gathered = await asyncio.gather(*tasks, return_exceptions=True)
    all_raw: list[dict] = []
    for result in gathered:
        if isinstance(result, list):
            all_raw.extend(result)
    # Tekrar eden başlıkları kaldır
    seen: set[str] = set()
    unique: list[dict] = []
    for item in all_raw:
        key = item["title"][:60].lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    # En güncel 30 haber
    unique.sort(key=lambda x: x["published_at"], reverse=True)
    unique = unique[:30]
    results: list[dict] = []
    for idx, item in enumerate(unique):
        title = item["title"]
        cat   = item["default_category"]
        # İlk 12 haber tam AI analizi, geri kalanlar hızlı
        if idx < 12:
            analysis = _analyze_with_ai(title, item["source"], lang=lang)
        else:
            analysis = _score_without_ai(title, item["source"])
        display_category = (
            _detect_category(title, []) if filter_type == "ALL"
            else _CAT_LABEL.get(cat, cat)
        )
        results.append({
            "id": f"{cat}-{idx}-{abs(hash(title)) % 999999}",
            "title": analysis.get("title_tr", title) if lang == "tr" else title,
            "source": item["source"],
            "url": item["url"],
            "symbols": _detect_symbols(title),
            "category": display_category,
            "is_breaking": item["is_breaking"],
            "ai_impact_score": analysis["ai_impact_score"],
            "sentiment": analysis["sentiment"],
            "ai_summary": analysis["ai_summary"],
            "published_at": item["published_at"],
        })
    return results


def _get_fallback_news() -> list[dict]:
    """Haber akışı geçici olarak ulaşılamaz durumdaysa dönen şık placeholder veri."""
    now = datetime.now(timezone.utc).isoformat()
    placeholders = [
        ("Global Markets Update: Investors Watch Fed Signals",         "Reuters",         "Makro",    52, ["USD", "EUR"]),
        ("Bitcoin Consolidates Near Key Support Level",                 "CoinDesk",        "Kripto",   49, ["BTCUSDT"]),
        ("Tech Giants Report Strong Earnings This Quarter",            "Bloomberg",       "Hisse",    47, ["AAPL", "NVDA"]),
        ("Dollar Index Steady Ahead of Economic Data Release",         "FXStreet",        "FX/Döviz", 44, ["USD", "EUR"]),
        ("Central Banks Signal Cautious Approach to Rate Decisions",   "Financial Times", "Makro",    41, ["USD"]),
    ]
    return [
        {
            "id": f"fallback-{i}",
            "title": title,
            "source": source,
            "symbols": syms,
            "category": cat,
            "is_breaking": False,
            "ai_impact_score": score,
            "sentiment": "Neutral",
            "ai_summary": "Haber akışı güncelleniyor, lütfen kısa süre içinde tekrar deneyin.",
            "published_at": now,
            "url": "#",
        }
        for i, (title, source, cat, score, syms) in enumerate(placeholders)
    ]


# ── Endpoint'ler ──────────────────────────────────────────────────────────────

@router.get("/news/feed")
async def get_news_feed(
    filter_type: str = Query("ALL", pattern="^(ALL|CRYPTO|STOCKS|MACRO|FX)$"),
    lang: str = Query("tr", pattern="^(tr|en)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Global finans haber akışı. filter_type ile kategori bazlı süzme yapılır.
    Haberler RSS kaynaklarından çekilir, Gemini AI ile analiz edilir, 15dk cache'lenir.
    """
    cache_key = f"wt:news:feed:{filter_type}:{lang}"
    cached_news = cache_get(cache_key)

    if not cached_news:
        news_items = await _fetch_category_news(filter_type, lang=lang)
        if news_items:
            cache_set(cache_key, news_items, ttl_seconds=NEWS_CACHE_TTL)
            cached_news = news_items
        else:
            cached_news = _get_fallback_news()

    # Breaking öne al, impact score'a göre sırala
    result = sorted(cached_news, key=lambda x: (not x.get("is_breaking"), -x.get("ai_impact_score", 0)))

    return {
        "filter_type": filter_type,
        "has_breaking": any(n.get("is_breaking") for n in result),
        "items": result,
        "cached": bool(cache_get(cache_key)),
        "source": "rss",
    }


@router.get("/news")
async def get_news():
    """
    Ekonomik takvim verisi — TradingView widget bu endpoint'e ihtiyaç duymaz
    (widget kendi verisini çeker). Bu endpoint eski uyumluluk için tutulur.
    """
    return {"status": "ok", "message": "Takvim verileri TradingView EconomicCalendar widget'ı üzerinden sağlanmaktadır."}


@router.get("/alerts/{symbol}")
async def get_alerts(symbol: str):
    """Son haberlere göre sembol bazlı uyarı döner."""
    cached_news = cache_get("wt:news:feed:ALL:en") or cache_get("wt:news:feed:ALL:tr") or []

    symbol_news = [
        n for n in cached_news
        if symbol.upper() in [s.upper() for s in n.get("symbols", [])]
        and n.get("ai_impact_score", 0) >= 60
    ]

    alerts = [
        {
            "time": n.get("published_at", "")[:16].replace("T", " "),
            "currency": symbol.split("USDT")[0] if "USDT" in symbol else symbol,
            "event": n.get("title", ""),
            "impact": "High" if n.get("ai_impact_score", 0) >= 80 else "Medium",
            "ai": n.get("ai_summary", ""),
        }
        for n in symbol_news[:2]
    ]

    return {"status": "ok", "alerts": alerts}


@router.get("/price/{symbol}")
async def get_price(symbol: str):
    """Twelve Data'dan anlık fiyat çeker."""
    try:
        api_key = os.getenv("TWELVE_DATA_API_KEY")
        symbol_map = {
            "XAUUSD": "XAU/USD", "XAGUSD": "XAG/USD",
            "EURUSD": "EUR/USD", "GBPUSD": "GBP/USD", "USDJPY": "USD/JPY",
        }
        if symbol.endswith("USDT"):
            formatted = symbol.replace("USDT", "/USD")
        elif symbol in symbol_map:
            formatted = symbol_map[symbol]
        elif "/" not in symbol and len(symbol) == 6:
            formatted = symbol[:3] + "/" + symbol[3:]
        else:
            formatted = symbol

        url = f"https://api.twelvedata.com/price?symbol={formatted}&apikey={api_key}"
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            data = res.json()
            if "price" in data:
                return {"status": "ok", "symbol": symbol, "price": data["price"]}
            return {"status": "error", "msg": f"Sembol bulunamadı: {formatted}"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}


# ── Akıllı Radar ─────────────────────────────────────────────────────────────

class MacroShock(BaseModel):
    news_title: str
    asset_class: str


@router.post("/radar/analyze-shock")
def analyze_macro_shock(shock: MacroShock, db: Session = Depends(get_db)):
    """
    Sisteme bir macro şok verisi düştüğünde tetiklenir.
    OPEN pozisyonları Gemini AI ile analiz eder, risk varsa alert üretir.
    """
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {"status": "error", "message": "GEMINI_API_KEY bulunamadı!"}

        genai_client2 = genai.Client(api_key=api_key)

        open_trades = db.query(TradeLog).filter(TradeLog.status == "OPEN").all()

        if not open_trades:
            return {
                "status": "success",
                "message": "Şu an risk altında açık pozisyon (OPEN) bulunmuyor.",
                "alerts": [],
            }

        alerts = []

        for trade in open_trades:
            prompt = f"""
Kullanıcının şu an {trade.symbol} paritesinde {trade.trade_type} işlemi var. Giriş fiyatı: {trade.entry_price}.
Piyasaya şu acil haber düştü: "{shock.news_title}".
Bu haber kullanıcının pozisyonu için TEHLİKELİ Mİ (Riskli)?
Sadece geçerli bir JSON formatında dön: {{"is_risk": true/false, "alert_message": "1 cümlelik acil eylem tavsiyesi"}}
Lütfen sadece JSON dön, etrafında markdown bloğu (```) olmasın.
            """

            try:
                response = genai_client2.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                res_text = response.text.strip()

                if res_text.startswith("```json"):
                    res_text = res_text[7:]
                elif res_text.startswith("```"):
                    res_text = res_text[3:]
                if res_text.endswith("```"):
                    res_text = res_text[:-3]
                res_text = res_text.strip()

                analysis = json.loads(res_text)

                if analysis.get("is_risk") is True:
                    alerts.append({
                        "user_id": trade.user_id,
                        "trade_id": trade.id,
                        "symbol": trade.symbol,
                        "trade_type": trade.trade_type,
                        "alert_message": analysis.get("alert_message", "Şok haberi: Acil müdahale gerekebilir!"),
                    })

            except Exception as e:
                _logger.error("[News] Trade ID %s AI analiz hatası: %s", trade.id, e)
                continue

        return {
            "status": "success",
            "shock_event": shock.news_title,
            "total_open_trades_scanned": len(open_trades),
            "total_alerts_generated": len(alerts),
            "alerts": alerts,
        }

    except Exception as e:
        _logger.error("[News] radar hatası: %s", __import__('traceback').format_exc())
        return {"status": "error", "message": f"Radar hatası: {str(e)}"}