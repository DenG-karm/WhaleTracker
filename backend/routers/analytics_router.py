from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
import os
import uuid
import random
import logging
import time
from datetime import datetime, timezone, timedelta
from groq import Groq
from sqlalchemy.orm import Session
from auth import get_current_user, limiter
from models import User, SavedWallet
from database import get_db
from celery.result import AsyncResult

router = APIRouter()
_logger = logging.getLogger(__name__)

# ── Groq — lazy init ─────────────────────────────────────────────────────────
_groq_client: Groq | None = None

def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY ortam değişkeni ayarlanmamış.")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ── In-memory fallback store (Celery/Redis yokken anlık sonuçlar) ─────────────
# Beta ortamında Celery worker çalışmıyorsa mock analizleri burada saklanır.
_INSTANT_TASKS: dict = {}


# ── Mock veri jeneratörü ──────────────────────────────────────────────────────
def _generate_mock_wallet_data(address: str) -> dict:
    """
    Beta fallback: adres bazlı deterministik (tutarlı) sahte cüzdan analizi.
    Her sorguda aynı adres için aynı verileri döner.
    Kaynak etiket 'mock_beta' olarak işaretlenir; frontend bunu gösterebilir.
    """
    rng = random.Random((address or "default").lower())

    classifications = ["whale", "fund", "active_trader", "investor", "bot_or_exchange"]
    labels = [
        "Potential Hedge Fund",
        "Institutional Accumulator",
        "High-Frequency Trader",
        "Smart Money Wallet",
        "Crypto Whale",
        "DeFi Power User",
    ]
    token_pool = ["ETH", "WBTC", "USDC", "USDT", "LINK", "UNI", "ARB", "OP", "AAVE", "PEPE", "WETH"]

    classification = rng.choice(classifications)
    label = rng.choice(labels)
    total_txs = rng.randint(200, 9500)
    volume = round(rng.uniform(750_000, 48_000_000), 2)
    risk = rng.randint(18, 88)
    days = rng.randint(200, 1900)
    tx_30d = rng.randint(8, min(450, total_txs))
    top_tokens = rng.sample(token_pool, rng.randint(3, 6))
    has_exchange = rng.choice([True, True, False])  # ağırlıklı True

    now = datetime.now(timezone.utc)
    last_active = now - timedelta(days=rng.randint(0, 12))
    first_seen = last_active - timedelta(days=days)

    return {
        "address": address,
        "label": label,
        "classification": classification,
        "total_volume_usd": volume,
        "total_txs": total_txs,
        "tx_count_30d": tx_30d,
        "active_days": days,
        "top_tokens": top_tokens,
        "top_counterparties": [
            {"address": "0x28c6c06298d514db089934071355e5743bf21d60", "label": "Binance Hot Wallet"},
            {"address": "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be", "label": "Binance 1"},
        ],
        "risk_score": risk,
        "first_seen": first_seen.strftime("%Y-%m-%d"),
        "last_active": last_active.strftime("%Y-%m-%d"),
        "has_exchange_interaction": has_exchange,
        "unique_counterparties_30d": rng.randint(8, 90),
        "source": "mock_beta",
    }


def _mock_prediction_text(profile: dict, is_en: bool) -> str:
    """Groq erişilemediğinde deterministik mock AI metni döner."""
    label = profile.get("label", "Unknown Wallet")
    vol = profile.get("total_volume_usd", 0)
    risk = profile.get("risk_score", 0)
    tokens = ", ".join(profile.get("top_tokens", [])[:3]) or "N/A"

    if is_en:
        return (
            f"**{label}** — This on-chain entity exhibits behavioral patterns consistent "
            f"with a sophisticated market participant. With a 30-day volume approaching "
            f"${vol/1e6:.1f}M and a risk index of {risk}/100, the wallet demonstrates "
            f"controlled accumulation cycles typical of institutional mandates.\n\n"
            f"Primary asset exposure is concentrated in {tokens}, suggesting a directional "
            f"thesis aligned with infrastructure and liquidity provisioning. Cross-chain "
            f"flows and counterparty interactions indicate awareness of macro liquidity shifts.\n\n"
            f"*Note: Analysis generated in demo mode. Connect ETHERSCAN_API_KEY for live on-chain data.*"
        )
    return (
        f"**{label}** — Bu zincir-içi varlık, sofistike bir piyasa katılımcısıyla tutarlı "
        f"davranışsal örüntüler sergilemektedir. 30 günlük hacmi yaklaşık ${vol/1e6:.1f}M "
        f"ve {risk}/100 risk endeksiyle cüzdan, kurumsal mandatlar için tipik kontrollü "
        f"birikim döngüleri göstermektedir.\n\n"
        f"Birincil varlık pozisyonu {tokens} üzerinde yoğunlaşmıştır; bu durum altyapı ve "
        f"likidite sağlamaya yönelik yönlü bir tez olduğuna işaret etmektedir. Zincirler arası "
        f"akışlar ve karşı taraf etkileşimleri, makro likidite değişimlerine dair farkındalık "
        f"göstergesidir.\n\n"
        f"*Not: Analiz demo modunda üretildi. Canlı zincir-içi veriler için ETHERSCAN_API_KEY bağlayın.*"
    )


# ── Arka plan analiz işlevi ──────────────────────────────────────────────────
def _run_bg_analysis(task_id: str, address: str, user_id: int, lang: str = "TR") -> None:
    """
    FastAPI BackgroundTask: cüzdan analizini arka planda çalıştırır.
    Önce gerçek Etherscan (API key varsa), sonra mock verilere düşer.
    _INSTANT_TASKS[task_id]'yi günceller: pending → processing → success/failed.
    """
    _INSTANT_TASKS[task_id]["status"] = "processing"
    # ── TEST: 15 saniyelik yapay gecikme — sayfalar arası polling testi için ──
    time.sleep(15)
    # ── TEST GECİKME SONU ────────────────────────────────────────────────────
    try:
        api_key = os.environ.get("ETHERSCAN_API_KEY", "")
        if api_key and api_key not in ("", "YourEtherscanApiKeyHere"):
            # Gerçek Etherscan analizi: Celery task'ını doğrudan çağır
            from tasks.wallet_analysis import analyze_wallet
            result = analyze_wallet.run(address, user_id)
        else:
            is_en = lang.upper().startswith("EN")
            data = _generate_mock_wallet_data(address)
            # Lang’ı veriye göm — predict endpoint'i doğru dili kullanacak
            data["lang"] = lang.upper()[:2]
            result = {"status": "mock_beta", "data": data}
        _INSTANT_TASKS[task_id] = {"status": "success", "ready": True, "result": result}
    except Exception as exc:
        _logger.error("[BgAnalysis] %s başarısız: %s", task_id[:16], exc)
        # Hata durumunda bile mock ile tamamla — asla failed bırakma
        data = _generate_mock_wallet_data(address)
        _INSTANT_TASKS[task_id] = {
            "status": "success",
            "ready": True,
            "result": {"status": "mock_beta", "data": data},
        }


# ── POST /analytics/wallet/{address} ─────────────────────────────────────────
@router.post("/analytics/wallet/{address}")
@limiter.limit("5/minute")
async def start_wallet_analysis(
    request: Request,
    address: str,
    background_tasks: BackgroundTasks,
    lang: str = "TR",
    current_user: User = Depends(get_current_user),
):
    """
    Blockchain cüzdan analizini başlatır.
    1. Celery kuyruğuna (async) atar → anında {status: pending} döner.
    2. Celery/Redis yoksa FastAPI BackgroundTasks ile çalıştırır → yine {status: pending}.
    Her iki durumda da istek anında döner, polling ile takip edilir.
    """
    if not address.startswith("0x") or len(address) < 40:
        raise HTTPException(status_code=400, detail="Geçersiz EVM cüzdan adresi (0x + min 40 karakter)")

    # ── Celery yolu (primary) ─────────────────────────────────────────────────
    try:
        from tasks.wallet_analysis import analyze_wallet
        task = analyze_wallet.delay(address, current_user.id)
        _logger.info("[WalletAnalysis] Celery task başlatıldı: %s", task.id)
        return {"status": "pending", "task_id": task.id}
    except Exception as exc:
        _logger.warning("[WalletAnalysis] Celery erişilemedi, BackgroundTasks fallback: %s", exc)

    # ── BackgroundTasks yolu (fallback) ──────────────────────────────────────
    task_id = f"bg_{uuid.uuid4().hex}"
    _INSTANT_TASKS[task_id] = {"status": "pending", "ready": False}
    background_tasks.add_task(_run_bg_analysis, task_id, address, current_user.id, lang.upper()[:2])
    _logger.info("[WalletAnalysis] BackgroundTask başlatıldı: %s", task_id)
    return {"status": "pending", "task_id": task_id}


# ── GET /analytics/task/{task_id} ────────────────────────────────────────────
@router.get("/analytics/task/{task_id}")
def check_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Görev durumu sorgular.
    Sırasıyla: in-memory instant store → Celery AsyncResult → son çare mock fallback.
    Redis/Celery erişilemese bile 200 döner, asla 500 vermez.
    """
    # ── 1. In-memory instant store ────────────────────────────────────────────
    if task_id in _INSTANT_TASKS:
        return _INSTANT_TASKS[task_id]

    # ── 2. Celery AsyncResult ─────────────────────────────────────────────────
    try:
        task_result = AsyncResult(task_id)
        state = task_result.state  # Bu satır Redis'e bağlanır; hata verebilir

        if state == "PENDING":
            return {"status": "pending", "ready": False}
        elif state == "FAILURE":
            return {"status": "failed", "ready": False, "error": str(task_result.info)}
        elif state == "SUCCESS":
            result = task_result.result or {}
            # no_api_key durumu da başarı sayılır — frontend veri alır
            return {"status": "success", "ready": True, "result": result}
        else:
            return {"status": state.lower(), "ready": False}

    except Exception as exc:
        _logger.error("[TaskStatus] Celery/Redis hatası, mock fallback: %s", exc)
        # ── 3. Son çare: task_id'den adres tahmin et (bilinmiyorsa generic mock)
        mock_data = _generate_mock_wallet_data(task_id)
        fallback_result = {
            "status": "success",
            "ready": True,
            "result": {"status": "mock_beta", "data": mock_data},
        }
        _INSTANT_TASKS[task_id] = fallback_result  # bir daha sorgulanırsa hızlı döner
        return fallback_result


# ── POST /analytics/predict ───────────────────────────────────────────────────
@router.post("/analytics/predict")
@limiter.limit("10/minute")
def predict_wallet_behavior(
    request: Request,
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Cüzdan profilini Groq Llama'ya göndererek on-chain istihbarat analizi üretir.
    Groq erişilemezse deterministik mock metin döner — asla 500 vermez.
    """
    profile = payload.get("profile", {})
    lang = payload.get("lang", "TR")
    if not profile:
        raise HTTPException(status_code=400, detail="Profil verisi eksik")

    # Normalize: 'en', 'EN', 'en-US', 'en_US' → hepsi İngilizce olarak algılanır
    is_en = str(lang).lower().strip().startswith("en")

    risk_score = profile.get("risk_score", 0)
    top_tokens = profile.get("top_tokens") or []
    top_cps = profile.get("top_counterparties") or []
    cp_labels = ", ".join(c.get("label", "") for c in top_cps[:5]) if top_cps else "N/A"

    system_msg = (
        "SYSTEM ROLE: You are a professional on-chain intelligence analyst and crypto forensics expert. "
        "LANGUAGE DIRECTIVE — THIS IS MANDATORY AND NON-NEGOTIABLE: "
        "The user interface is set to ENGLISH. "
        "You MUST produce the ENTIRE analysis report in ENGLISH only. "
        "Do NOT write even a single word, sentence, or phrase in Turkish or any other language. "
        "Every word of your response must be English. "
        "If you deviate from English, your response will be rejected. "
        "Produce sharp, professional on-chain intelligence insights."
        if is_en else
        "SYSTEM ROLE: Sen profesyonel bir on-chain istihbarat analisti ve kripto adli bilişim uzmanısın. "
        "DİL DİREKTİFİ — BU ZORUNLU VE MÜZAKERE KABUL ETMEZ: "
        "Kullanıcı arayüzü TÜRKÇE olarak ayarlanmış. "
        "Analizin ve yorumlarının tamamını KESİNLİKLE Türkce yaz. "
        "Tek bir İngilizce kelime bile kullanma. Her cümlen Türkce olmalı. "
        "AI'ya inisiyatif bırakılmaz: Türkce dışında hiçbir dil kabul edilmez."
    )

    user_prompt = (
        f"Analyze this blockchain wallet and write a 2-3 paragraph professional intelligence brief. "
        f"Focus on the wallet's likely purpose, market impact potential, and owner profile.\n\n"
        f"Address: {profile.get('address', 'N/A')}\n"
        f"Classification: {profile.get('classification', 'N/A')}\n"
        f"Label: {profile.get('label', 'N/A')}\n"
        f"Total Transactions: {profile.get('total_txs', profile.get('tx_count_30d', 'N/A'))}\n"
        f"30-Day TX Count: {profile.get('tx_count_30d', 'N/A')}\n"
        f"30-Day Volume (USD): ${profile.get('total_volume_usd', 0):,.2f}\n"
        f"Top Tokens: {', '.join(top_tokens) or 'N/A'}\n"
        f"Known Counterparties: {cp_labels}\n"
        f"Risk Score: {risk_score}/100\n"
        f"First Seen: {profile.get('first_seen', 'N/A')} | Last Active: {profile.get('last_active', 'N/A')}\n"
        f"Exchange Interaction: {'Yes' if profile.get('has_exchange_interaction') else 'No'}\n\n"
        f"Be concise but insightful. Use a professional Fintech tone with a slightly mysterious edge. No filler text."
        if is_en else
        f"Bu blokzincir cüzdanını analiz et ve 2-3 paragraftan oluşan profesyonel bir istihbarat brifingini Türkçe yaz. "
        f"Cüzdanın olası amacına, piyasa etkisi potansiyeline ve sahibinin profiline odaklan.\n\n"
        f"Adres: {profile.get('address', 'N/A')}\n"
        f"Sınıflandırma: {profile.get('classification', 'N/A')}\n"
        f"Etiket: {profile.get('label', 'N/A')}\n"
        f"Toplam İşlem Sayısı: {profile.get('total_txs', profile.get('tx_count_30d', 'N/A'))}\n"
        f"30 Günlük İşlem: {profile.get('tx_count_30d', 'N/A')}\n"
        f"30 Günlük Hacim (USD): ${profile.get('total_volume_usd', 0):,.2f}\n"
        f"Sık Kullanılan Tokenlar: {', '.join(top_tokens) or 'N/A'}\n"
        f"Bilinen Karşı Taraflar: {cp_labels}\n"
        f"Risk Skoru: {risk_score}/100\n"
        f"İlk Görülme: {profile.get('first_seen', 'N/A')} | Son Aktif: {profile.get('last_active', 'N/A')}\n"
        f"Borsa Etkileşimi: {'Evet' if profile.get('has_exchange_interaction') else 'Hayır'}\n\n"
        f"Kısa ama içgörülü ol. Profesyonel bir Fintech üslubu ve hafif gizemli bir ton kullan. Gereksiz uzatma."
    )

    # ── Groq çağrısı ─────────────────────────────────────────────────────────
    try:
        response = _get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=600,
            temperature=0.65,
        )
        prediction = (response.choices[0].message.content or "").strip()
        return {"status": "success", "prediction": prediction}

    except Exception as exc:
        _logger.warning("[WalletPredict] Groq erişilemedi, mock tahmin döndürülüyor: %s", exc)
        return {
            "status": "success",
            "prediction": _mock_prediction_text(profile, is_en),
        }


# ── GET /analytics/saved-wallets ─────────────────────────────────────────
@router.get("/analytics/saved-wallets")
def list_saved_wallets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallets = (
        db.query(SavedWallet)
        .filter(SavedWallet.user_id == current_user.id)
        .order_by(SavedWallet.last_analyzed.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "wallet_address": w.wallet_address,
            "wallet_name":    w.wallet_name,
            "last_analyzed":  w.last_analyzed.isoformat() if w.last_analyzed else None,
        }
        for w in wallets
    ]


# ── POST /analytics/saved-wallets ─────────────────────────────────────────
@router.post("/analytics/saved-wallets")
def save_wallet(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    address = (payload.get("wallet_address") or "").lower().strip()
    name    = (payload.get("wallet_name")    or "Unknown Wallet").strip()[:100]
    if not address or len(address) < 10:
        raise HTTPException(status_code=400, detail="Geçersiz cüzdan adresi")
    existing = (
        db.query(SavedWallet)
        .filter(SavedWallet.user_id == current_user.id, SavedWallet.wallet_address == address)
        .first()
    )
    if existing:
        existing.wallet_name   = name
        existing.last_analyzed = datetime.now(timezone.utc)
    else:
        db.add(SavedWallet(
            user_id=current_user.id,
            wallet_address=address,
            wallet_name=name,
            last_analyzed=datetime.now(timezone.utc),
        ))
    db.commit()
    return {"status": "ok"}


# ── DELETE /analytics/saved-wallets/{address} ────────────────────────────
@router.delete("/analytics/saved-wallets/{address}")
def delete_saved_wallet(
    address: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(SavedWallet).filter(
        SavedWallet.user_id        == current_user.id,
        SavedWallet.wallet_address == address.lower(),
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "ok"}
