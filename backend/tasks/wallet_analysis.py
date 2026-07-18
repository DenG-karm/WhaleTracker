"""
tasks/wallet_analysis.py — Gerçek Cüzdan Analiz Görevi
========================================================
Etherscan API kullanarak EVM cüzdan adresini derinlemesine analiz eder.
Celery kuyruğunda arka planda çalışır, sonucu Redis'te saklar.

API Kaynak: https://etherscan.io/myapikey (ücretsiz: 5 req/s, 100k/gün)
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict
from celery_app import celery_app
from cache import cache_set, cache_get

ETHERSCAN_BASE = "https://api.etherscan.io/api"

# Bilinen büyük borsa/kurum listesi
KNOWN_ENTITIES = {
    "0x28c6c06298d514db089934071355e5743bf21d60": ("Binance Hot Wallet", "exchange"),
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": ("Binance Cold Wallet", "exchange"),
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": ("Binance Reserve", "exchange"),
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": ("Binance 1", "exchange"),
    "0xdc24316b9ae028f1497c275eb9192a3ea0f67022": ("Curve stETH/ETH Pool", "defi"),
    "0x8eb8a3b98659cce290402893d0123abb75e3ab28": ("Avalanche Bridge", "bridge"),
    "0x9696f59e4d72e237be84ffd425dcad154bf96976": ("Tether Treasury", "issuer"),
    "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": ("Binance US 1", "exchange"),
    "0x5041ed759dd4afc3a72b8192c143f72f4724081f": ("OKX Wallet", "exchange"),
}

FALLBACK_TOKEN_PRICES = {
    "ETH": 3200.0, "WETH": 3200.0, "WBTC": 68000.0,
    "USDT": 1.0, "USDC": 1.0, "DAI": 1.0, "BUSD": 1.0,
    "BNB": 380.0, "LINK": 18.0, "UNI": 8.0, "SHIB": 0.000024,
    "PEPE": 0.000013, "ARB": 1.1, "OP": 2.5,
}


def _etherscan_get(params: dict) -> dict:
    """Etherscan API'ye GET isteği atar."""
    api_key = os.getenv("ETHERSCAN_API_KEY", "")
    params["apikey"] = api_key
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(ETHERSCAN_BASE, params=params)
        return resp.json()


def _classify_wallet(address: str, tx_count: int, volume_usd: float, unique_tokens: list) -> tuple[str, str]:
    """
    Cüzdanı basit heuristik ile sınıflandırır.
    Döner: (classification, label)
    """
    lower = address.lower()

    # Bilinen kurum mü?
    if lower in KNOWN_ENTITIES:
        label, cls = KNOWN_ENTITIES[lower]
        return cls, label

    # Yüksek işlem sayısı → muhtemelen bot/exchange
    if tx_count > 5000:
        return "bot_or_exchange", f"High-Freq Wallet ({tx_count} tx)"
    if tx_count > 1000:
        return "active_trader", f"Active Trader ({tx_count} tx)"

    # Büyük hacim → muhtemelen fund/whale
    if volume_usd > 100_000_000:
        return "fund", f"Potential Fund (${volume_usd/1e6:.0f}M volume)"
    if volume_usd > 10_000_000:
        return "whale", f"Whale (${volume_usd/1e6:.1f}M volume)"
    if volume_usd > 1_000_000:
        return "investor", f"Large Investor"

    # Stablecoin yoğun → risk-off profil
    stable_tokens = {"USDT", "USDC", "DAI", "BUSD"}
    if len(unique_tokens) > 0 and all(t in stable_tokens for t in unique_tokens[:3]):
        return "stablecoin_holder", "Stablecoin Focused"

    return "unknown", "Unknown Wallet"


def _calculate_risk_score(
    tx_count: int,
    volume_usd: float,
    unique_counterparties: int,
    has_exchange_interaction: bool,
    days_active: int,
) -> float:
    """
    0.0 (düşük risk) – 1.0 (yüksek risk) arası skor üretir.
    Yüksek frekans, yüksek hacim, borsa etkileşimi riski artırır.
    """
    score = 0.0

    # İşlem sıklığı riski
    if tx_count > 500:
        score += 0.25
    elif tx_count > 100:
        score += 0.15
    elif tx_count > 20:
        score += 0.05

    # Hacim riski
    if volume_usd > 10_000_000:
        score += 0.30
    elif volume_usd > 1_000_000:
        score += 0.20
    elif volume_usd > 100_000:
        score += 0.10

    # Karşı taraf çeşitliliği
    if unique_counterparties > 100:
        score += 0.20
    elif unique_counterparties > 20:
        score += 0.10

    # Borsa etkileşimi
    if has_exchange_interaction:
        score += 0.15

    # Kısa sürede çok işlem (pump & dump riski)
    if days_active > 0 and tx_count / days_active > 50:
        score += 0.10

    return min(round(score, 2), 1.0)


@celery_app.task(
    name="tasks.wallet_analysis.analyze_wallet",
    queue="whale_alerts",
    bind=True,
    max_retries=2,
    soft_time_limit=120,
)
def analyze_wallet(self, wallet_address: str, user_id: int) -> dict:
    """
    Etherscan API ile gerçek EVM cüzdan analizi yapar.
    Cache'de varsa Redis'ten hızlıca döner.
    """
    import time

    cache_key = f"wt:analysis:{wallet_address[:10].lower()}"

    # Cache'de varsa direkt dön (1 saatlik TTL)
    cached = cache_get(cache_key)
    if cached:
        return {"status": "cached", "data": cached}

    api_key = os.getenv("ETHERSCAN_API_KEY", "")

    # API key yoksa bilgilendirici fallback döner
    if not api_key or api_key == "YourEtherscanApiKeyHere":
        analysis = {
            "address": wallet_address,
            "label": "API Key Gerekli",
            "classification": "unknown",
            "total_volume_usd": 0,
            "tx_count_30d": 0,
            "top_tokens": [],
            "top_counterparties": [],
            "risk_score": 0.0,
            "first_seen": "N/A",
            "last_active": "N/A",
            "has_exchange_interaction": False,
            "error": "ETHERSCAN_API_KEY .env dosyasına eklenmedi. https://etherscan.io/myapikey adresinden ücretsiz alabilirsiniz.",
        }
        return {"status": "no_api_key", "data": analysis}

    try:
        # ── 1. Normal ETH işlem geçmişi ──────────────────────────────────────
        tx_resp = _etherscan_get({
            "module": "account", "action": "txlist",
            "address": wallet_address,
            "startblock": 0, "endblock": 99999999,
            "page": 1, "offset": 200,
            "sort": "desc",
        })

        all_txs = tx_resp.get("result", []) if tx_resp.get("status") == "1" else []
        
        # ── 2. ERC-20 Token transferleri ──────────────────────────────────────
        token_resp = _etherscan_get({
            "module": "account", "action": "tokentx",
            "address": wallet_address,
            "page": 1, "offset": 200,
            "sort": "desc",
        })

        token_txs = token_resp.get("result", []) if token_resp.get("status") == "1" else []

        # ── 3. Son 30 gün filtreleme ──────────────────────────────────────────
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        
        recent_txs = []
        for tx in all_txs:
            ts = int(tx.get("timeStamp", 0))
            if datetime.fromtimestamp(ts, tz=timezone.utc) >= cutoff:
                recent_txs.append(tx)

        recent_token_txs = []
        for tx in token_txs:
            ts = int(tx.get("timeStamp", 0))
            if datetime.fromtimestamp(ts, tz=timezone.utc) >= cutoff:
                recent_token_txs.append(tx)

        # ── 4. Token dağılımı & hacim hesabı ─────────────────────────────────
        token_counts: Counter = Counter()
        counterparties: set = set()
        total_volume_usd = 0.0
        has_exchange_interaction = False

        for tx in recent_token_txs:
            symbol = tx.get("tokenSymbol", "UNKNOWN").upper()
            token_counts[symbol] += 1

            try:
                raw = int(tx.get("value", 0))
                decimals = int(tx.get("tokenDecimal", 18))
                amount = raw / (10 ** decimals)
                price = FALLBACK_TOKEN_PRICES.get(symbol, 0.0)
                total_volume_usd += amount * price
            except (ValueError, ZeroDivisionError):
                pass

            # Karşı taraf analizi
            cp = tx.get("to", "").lower() if tx.get("from", "").lower() == wallet_address.lower() else tx.get("from", "").lower()
            counterparties.add(cp)
            if cp in KNOWN_ENTITIES and KNOWN_ENTITIES[cp][1] == "exchange":
                has_exchange_interaction = True

        # ETH değerini de ekle
        for tx in recent_txs:
            try:
                eth_val = int(tx.get("value", 0)) / 1e18
                total_volume_usd += eth_val * FALLBACK_TOKEN_PRICES["ETH"]
                cp = tx.get("to", "").lower() if tx.get("from", "").lower() == wallet_address.lower() else tx.get("from", "").lower()
                counterparties.add(cp)
            except (ValueError, ZeroDivisionError):
                pass

        # ── 5. Hesap yaşı ────────────────────────────────────────────────────
        first_seen_str = "N/A"
        last_active_str = "N/A"
        days_active = 1

        if all_txs:
            oldest_ts = int(all_txs[-1].get("timeStamp", 0))
            newest_ts = int(all_txs[0].get("timeStamp", 0))
            first_seen_dt = datetime.fromtimestamp(oldest_ts, tz=timezone.utc)
            last_active_dt = datetime.fromtimestamp(newest_ts, tz=timezone.utc)
            first_seen_str = first_seen_dt.strftime("%Y-%m-%d")
            last_active_str = last_active_dt.strftime("%Y-%m-%d")
            days_active = max(1, (last_active_dt - first_seen_dt).days)

        # ── 6. Sınıflandırma & Risk ──────────────────────────────────────────
        top_tokens = [token for token, _ in token_counts.most_common(5)]
        classification, label = _classify_wallet(
            wallet_address,
            len(all_txs),
            total_volume_usd,
            top_tokens,
        )
        risk_score = _calculate_risk_score(
            tx_count=len(recent_txs) + len(recent_token_txs),
            volume_usd=total_volume_usd,
            unique_counterparties=len(counterparties),
            has_exchange_interaction=has_exchange_interaction,
            days_active=days_active,
        )

        top_cps = []
        for addr in list(counterparties)[:5]:
            if addr in KNOWN_ENTITIES:
                top_cps.append({"address": addr, "label": KNOWN_ENTITIES[addr][0]})
            elif addr:
                top_cps.append({"address": addr, "label": f"{addr[:6]}...{addr[-4:]}"})

        analysis = {
            "address": wallet_address,
            "label": label,
            "classification": classification,
            "total_volume_usd": round(total_volume_usd, 2),
            "total_txs": len(all_txs),                                   # tüm işlem sayısı (frontend için)
            "tx_count_30d": len(recent_txs) + len(recent_token_txs),
            "active_days": days_active,                                   # hesap yaşı (frontend için)
            "top_tokens": top_tokens,
            "top_counterparties": top_cps,
            "risk_score": int(round(risk_score * 100)),                   # 0–100 ölçeği (frontend /100 göstermez)
            "first_seen": first_seen_str,
            "last_active": last_active_str,
            "has_exchange_interaction": has_exchange_interaction,
            "unique_counterparties_30d": len(counterparties),
            "source": "etherscan",
        }

        # 1 saat cache'le
        cache_set(cache_key, analysis, ttl_seconds=3600)
        return {"status": "completed", "data": analysis}

    except Exception as exc:
        import logging as _logging
        _logging.getLogger(__name__).error("[WALLET-ANALYSIS] Hata (%s): %s", wallet_address[:10], exc)
        try:
            raise self.retry(exc=exc, countdown=15)
        except Exception:
            # max_retries aşıldıysa ya da Celery retry context yoksa zarif hata döner
            return {
                "status": "failed",
                "data": {
                    "address": wallet_address,
                    "error": str(exc),
                    "label": "Analysis Failed",
                    "classification": "unknown",
                    "total_volume_usd": 0,
                    "total_txs": 0,
                    "tx_count_30d": 0,
                    "active_days": 0,
                    "top_tokens": [],
                    "top_counterparties": [],
                    "risk_score": 0,
                    "first_seen": "N/A",
                    "last_active": "N/A",
                    "has_exchange_interaction": False,
                    "unique_counterparties_30d": 0,
                    "source": "error",
                },
            }
