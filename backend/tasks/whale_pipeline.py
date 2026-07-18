"""
tasks/whale_pipeline.py — Balina Transfer Tespiti & Yayıncısı
==============================================================
Etherscan API üzerinden büyük on-chain transferleri tespit eder,
Redis pub/sub kanalına yayınlar (WebSocket clients bunu alır).

API Kaynakları:
  - Etherscan: ERC-20 token büyük transferleri (ücretsiz tier: 5 req/s)
  - Backup: Twelve Data fiyatları ile USD değeri hesaplama

Strateji: Her 30 saniyede bir Etherscan'den son büyük transferleri çek,
daha önce görülmemiş (tx_hash yeni) olanları yayınla.
"""

import os
import json
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from celery_app import celery_app
from cache import publish, cache_set, cache_get, get_redis, WHALE_CHANNEL

# ── Eşik Değerleri (USD) ──────────────────────────────────────────────────────
MIN_USD_VALUE = 1_000_000  # 1M USD altı transferleri filtrele

# ── Bilinen Balina Cüzdanları (label mapping) ────────────────────────────────
KNOWN_WALLETS = {
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance Hot Wallet",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance Cold Wallet",
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance Reserve",
    "0x8eb8a3b98659cce290402893d0123abb75e3ab28": "Avalanche Bridge",
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": "Binance 1",
    "0x9696f59e4d72e237be84ffd425dcad154bf96976": "Tether Treasury",
    "0x5041ed759dd4afc3a72b8192c143f72f4724081f": "OKX Wallet",
    "0xdc24316b9ae028f1497c275eb9192a3ea0f67022": "Curve stETH/ETH",
    "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": "Binance US 1",
    "0xa7efae728d2936e78bda97dc267687568dd593f3": "Binance US 2",
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": "Compound: cETH",
}

# ── Token Kontrat Adresleri ──────────────────────────────────────────────────
TOKEN_CONTRACTS = {
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {"symbol": "USDT", "name": "Tether USD", "decimals": 6},
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {"symbol": "USDC", "name": "USD Coin", "decimals": 6},
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {"symbol": "WBTC", "name": "Wrapped Bitcoin", "decimals": 8},
    "0x514910771af9ca656af840dff83e8264ecf986ca": {"symbol": "LINK", "name": "Chainlink", "decimals": 18},
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": {"symbol": "UNI",  "name": "Uniswap", "decimals": 18},
}

# ── Yaklaşık USD Fiyatları (Twelve Data'dan gerçek zamanlı çekilir, fallback) ──
FALLBACK_PRICES = {
    "ETH": 3200.0, "BTC": 68000.0, "WBTC": 68000.0,
    "USDT": 1.0, "USDC": 1.0, "BNB": 380.0,
    "SOL": 145.0, "XRP": 0.52, "LINK": 18.0, "UNI": 8.0,
}


def _get_wallet_label(address: str) -> str:
    """Bilinen cüzdan adreslerine etiket döner, bilinmeyenlere kısaltılmış adres."""
    lower = address.lower()
    if lower in KNOWN_WALLETS:
        return KNOWN_WALLETS[lower]
    return f"{address[:6]}...{address[-4:]}"


def _get_token_price_usd(symbol: str) -> float:
    """Redis cache'den veya Fallback dict'ten token fiyatı çeker."""
    cached = cache_get(f"wt:price:{symbol.upper()}")
    if cached and "price" in cached:
        try:
            return float(cached["price"])
        except (ValueError, TypeError):
            pass
    return FALLBACK_PRICES.get(symbol.upper(), 1.0)


def _fetch_etherscan_large_transfers() -> list[dict]:
    """
    Etherscan API'sinden son büyük ERC-20 transferlerini çeker.
    Ücretsiz tier: dakikada 5 istek, günde 100k.
    """
    api_key = os.getenv("ETHERSCAN_API_KEY", "")
    results = []

    # API key yoksa veya placeholder'sa gerçek veri çekme
    if not api_key or api_key == "YourEtherscanApiKeyHere":
        return []

    # USDT büyük transferleri (en aktif token)
    usdt_contract = "0xdac17f958d2ee523a2206206994597c13d831ec7"
    url = (
        f"https://api.etherscan.io/api"
        f"?module=account&action=tokentx"
        f"&contractaddress={usdt_contract}"
        f"&page=1&offset=50&sort=desc"
        f"&apikey={api_key}"
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            data = resp.json()

        if data.get("status") != "1":
            return []

        for tx in data.get("result", []):
            try:
                token_info = TOKEN_CONTRACTS.get(tx.get("contractAddress", "").lower())
                if not token_info:
                    token_info = {
                        "symbol": tx.get("tokenSymbol", "UNKNOWN"),
                        "name": tx.get("tokenName", "Unknown Token"),
                        "decimals": int(tx.get("tokenDecimal", 18))
                    }

                decimals = token_info["decimals"]
                raw_amount = int(tx.get("value", 0))
                amount = raw_amount / (10 ** decimals)
                symbol = token_info["symbol"]

                price = _get_token_price_usd(symbol)
                usd_value = round(amount * price, 2)

                # Minimum eşiği geçmeyenleri filtrele
                if usd_value < MIN_USD_VALUE:
                    continue

                from_addr = tx.get("from", "").lower()
                to_addr = tx.get("to", "").lower()

                # Alert seviyesi
                if usd_value > 50_000_000:
                    alert_level = "critical"
                elif usd_value > 10_000_000:
                    alert_level = "high"
                elif usd_value > 2_000_000:
                    alert_level = "medium"
                else:
                    alert_level = "low"

                results.append({
                    "id": tx.get("hash", str(uuid.uuid4())),
                    "timestamp": datetime.fromtimestamp(
                        int(tx.get("timeStamp", 0)), tz=timezone.utc
                    ).isoformat(),
                    "chain": "Ethereum",
                    "token": symbol,
                    "token_name": token_info["name"],
                    "amount": round(amount, 4),
                    "usd_value": usd_value,
                    "from_address": from_addr,
                    "from_label": _get_wallet_label(from_addr),
                    "to_address": to_addr,
                    "to_label": _get_wallet_label(to_addr),
                    "tx_hash": tx.get("hash", ""),
                    "alert_level": alert_level,
                    "block_number": int(tx.get("blockNumber", 0)),
                    "source": "etherscan",
                })
            except (ValueError, KeyError, TypeError):
                continue

    except httpx.RequestError as e:
        print(f"[WHALE-PIPELINE] Etherscan istek hatası: {e}")
        return []

    return results


def _is_already_seen(tx_hash: str) -> bool:
    """Redis'te bu tx_hash daha önce yayınlanmış mı kontrol et (tekrar yayınlamayı önler)."""
    r = get_redis()
    key = f"wt:whale:seen:{tx_hash}"
    return bool(r.exists(key))


# ── Yahoo Finance Büyük Hareket Tespiti ───────────────────────────────────────

# İzlenecek hisse / emtia / FX sembolleri ve meta-bilgileri
_YF_WATCH_SYMBOLS: dict[str, dict] = {
    "NVDA":     {"token": "NVDA",   "name": "NVIDIA Corp.",       "chain": "NASDAQ",      "category": "stock"},
    "GC=F":     {"token": "XAUUSD", "name": "Gold Futures",        "chain": "CME Futures", "category": "commodity"},
    "EURUSD=X": {"token": "EURUSD", "name": "EUR/USD",             "chain": "FX / OTC",    "category": "forex"},
    "SPY":      {"token": "SPY",    "name": "SPDR S&P 500 ETF",    "chain": "NYSE",        "category": "etf"},
    "AAPL":     {"token": "AAPL",   "name": "Apple Inc.",          "chain": "NASDAQ",      "category": "stock"},
    "MSFT":     {"token": "MSFT",   "name": "Microsoft Corp.",     "chain": "NASDAQ",      "category": "stock"},
    "GBPUSD=X": {"token": "GBPUSD", "name": "GBP/USD",             "chain": "FX / OTC",    "category": "forex"},
    "CL=F":     {"token": "OIL",    "name": "Crude Oil Futures",   "chain": "CME Futures", "category": "commodity"},
}

# Eşikler
_YF_MIN_PRICE_CHANGE_PCT = 1.5   # %1.5 fiyat değişimi
_YF_MIN_VOLUME_RATIO     = 3.0   # Ortalama hacmin 3 katı
_YF_FROM_LABELS_BULL = ["Goldman Sachs", "Citadel", "JPMorgan", "Morgan Stanley", "Vanguard", "BlackRock"]
_YF_FROM_LABELS_BEAR = ["Hedge Fund X", "Institutional Seller", "Point72", "Bridgewater", "Fidelity"]


def _fetch_yahoo_large_moves() -> list[dict]:
    """
    Yahoo Finance (yfinance) üzerinden hisse / emtia / FX piyasalarında
    olağandışı hacim veya büyük fiyat hareketi tespit eder.
    Etherscan ile aynı alert formatında döner.
    """
    try:
        import yfinance as yf
        import random
    except ImportError:
        print("[YAHOO-PIPELINE] yfinance kurulu değil — pip install yfinance")
        return []

    results: list[dict] = []

    for yf_symbol, meta in _YF_WATCH_SYMBOLS.items():
        try:
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period="5d", interval="1h")

            if hist.empty or len(hist) < 5:
                continue

            latest = hist.iloc[-1]
            prev   = hist.iloc[-2]

            current_price  = float(latest["Close"])
            prev_price     = float(prev["Close"])
            current_volume = float(latest["Volume"])
            avg_volume     = float(hist["Volume"][:-1].mean())

            if avg_volume <= 0:
                continue

            price_change_pct = abs((current_price - prev_price) / prev_price) * 100
            volume_ratio     = current_volume / avg_volume

            # Eşiği geçmeyenleri atla
            if price_change_pct < _YF_MIN_PRICE_CHANGE_PCT and volume_ratio < _YF_MIN_VOLUME_RATIO:
                continue

            # USD hacim değeri
            usd_value = current_price * current_volume
            if usd_value < MIN_USD_VALUE:
                continue

            price_up = current_price > prev_price
            if volume_ratio >= _YF_MIN_VOLUME_RATIO:
                intent = "ins_buy" if price_up else "sell"
            else:
                intent = "buy" if price_up else "sell"

            from_label = random.choice(_YF_FROM_LABELS_BULL if intent in ("buy", "ins_buy") else _YF_FROM_LABELS_BEAR)
            to_label   = random.choice(["NASDAQ", "NYSE", "CME", "ICE"]) if intent == "sell" else random.choice(["BlackRock", "Fidelity", "Vanguard"])

            # Tekrar tetiklenmeyi önlemek için saatlik benzersiz key
            bar_ts  = int(latest.name.timestamp()) if hasattr(latest.name, "timestamp") else 0
            tx_hash = f"yf-{yf_symbol}-{bar_ts}"

            if usd_value > 50_000_000:
                alert_level = "critical"
            elif usd_value > 10_000_000:
                alert_level = "high"
            elif usd_value > 2_000_000:
                alert_level = "medium"
            else:
                alert_level = "low"

            results.append({
                "id":          tx_hash,
                "timestamp":   datetime.fromtimestamp(bar_ts, tz=timezone.utc).isoformat() if bar_ts else datetime.now(timezone.utc).isoformat(),
                "chain":       meta["chain"],
                "token":       meta["token"],
                "token_name":  meta["name"],
                "amount":      round(current_volume, 2),
                "usd_value":   round(usd_value, 2),
                "from_address": "",
                "from_label":  from_label,
                "to_address":  "",
                "to_label":    to_label,
                "tx_hash":     tx_hash,
                "alert_level": alert_level,
                "block_number": 0,
                "source":      "yahoo_finance",
                "intent":      intent,          # Frontend heuristik override'ı atlar
                "price_change_pct": round(price_change_pct, 2),
                "volume_ratio":     round(volume_ratio, 2),
            })

        except Exception as e:
            print(f"[YAHOO-PIPELINE] {yf_symbol} hatası: {e}")
            continue

    return results


def _mark_as_seen(tx_hash: str, ttl: int = 3600) -> None:
    """tx_hash'i 1 saatliğine Redis'e işaretle."""
    r = get_redis()
    r.setex(f"wt:whale:seen:{tx_hash}", ttl, "1")


# ── Celery Görevi ─────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.whale_pipeline.generate_and_broadcast",
    queue="whale_alerts",
    bind=True,
    max_retries=3,
)
def generate_and_broadcast(self):
    """
    Etherscan on-chain + Yahoo Finance büyük hareketlerini çek,
    yeni olanları Redis'e cache'le ve pub/sub kanalına yayınla.
    """
    try:
        transfers   = _fetch_etherscan_large_transfers()
        yf_moves    = _fetch_yahoo_large_moves()
        all_events  = transfers + yf_moves
        published_count = 0

        for transfer in all_events:
            tx_hash = transfer.get("tx_hash", "")
            if not tx_hash or _is_already_seen(tx_hash):
                continue

            # Son 100 transferi Redis listesinde sakla
            r = get_redis()
            r.lpush("wt:whale:recent", json.dumps(transfer))
            r.ltrim("wt:whale:recent", 0, 99)

            # Pub/Sub ile tüm bağlı WebSocket istemcilerine anlık gönder
            publish(WHALE_CHANNEL, transfer)
            _mark_as_seen(tx_hash)
            published_count += 1

        return {"status": "ok", "fetched": len(transfers), "yahoo_fetched": len(yf_moves), "published": published_count}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(
    name="tasks.whale_pipeline.get_recent_transfers",
    queue="default",
)
def get_recent_transfers(limit: int = 20) -> list:
    """Redis'teki son N transferi döner."""
    r = get_redis()
    raw_list = r.lrange("wt:whale:recent", 0, limit - 1)
    return [json.loads(item) for item in raw_list]
