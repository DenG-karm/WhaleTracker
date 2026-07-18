from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os
import json
import logging
import traceback
import asyncio
import datetime
import httpx
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
from groq import Groq
from database import get_db
from models import User, TradeLog
from auth import get_current_user, limiter
from cache import cache_get, cache_set
from typing import List, Optional, Dict, Any

_logger = logging.getLogger(__name__)
from tasks.daily_bias import generate_daily_bias


def _build_dna_instruction(trader_profile_json: Optional[str]) -> str:
    """Trader DNA profili varsa sistem komutuna eklenecek metni üretir."""
    if not trader_profile_json:
        return ""
    try:
        profile = json.loads(trader_profile_json)
        style = profile.get("trading_style", "")
        risk = profile.get("risk_tolerance", "")
        markets = ", ".join(profile.get("primary_markets", []))
        if not (style and risk and markets):
            return ""
        return (
            f"\n\nKullanıcının işlem tarzı: {style}, risk toleransı: {risk}, "
            f"odakladığı piyasalar: {markets}. "
            "Tüm analizlerini ve dilini KESİNLİKLE bu profile göre ayarla."
        )
    except (json.JSONDecodeError, AttributeError):
        return ""

# .env dosyasını zorla oku — GROQ_API_KEY her zaman erişilebilir olsun
load_dotenv()

router = APIRouter()
_groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# 🌟 GÜNCELLEME: Sohbet geçmişi (history) ve resim (image) desteği eklendi
class ChatMessage(BaseModel):
    history: Optional[List[Dict[str, Any]]] = []
    message: str
    image: Optional[str] = None
    lang: Optional[str] = "TR"

class SetupAnalyzeRequest(BaseModel):
    symbol: str
    entry_price: float
    stop_loss: float
    balance: float
    risk: float
    image: Optional[str] = None
    lang: Optional[str] = "TR"


class DailyBiasRequest(BaseModel):
    symbol: str
    asian_session_data: Dict[str, Any] = Field(default_factory=dict)
    macro_events: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/ai/daily-bias")
@limiter.limit("10/minute")
async def daily_bias_endpoint(
    request: Request,
    data: DailyBiasRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Günlük piyasa yön kararı (Daily Bias).

    Body:
      symbol              – "XAUUSD" | "BTCUSDT" | "EURUSD" …
      asian_session_data  – { high, low, close, volume, swept_high, swept_low, range_pct }
      macro_events        – [{ time, currency, event, impact, forecast, previous }, …]

    Returns:
      { symbol, bias, confidence_score, ai_briefing }
    """
    return await generate_daily_bias(
        symbol=data.symbol,
        asian_session_data=data.asian_session_data,
        macro_events=data.macro_events,
    )


# ─── Yardımcı: RSS haber başlıkları ────────────────────────────────────────────
_DAILY_SUMMARY_FEEDS = [
    "https://news.google.com/rss/search?q=crypto+bitcoin+ethereum+market&hl=en&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=federal+reserve+inflation+stock+market&hl=en&gl=US&ceid=US:en",
]

async def _fetch_headlines(limit: int = 8) -> list[str]:
    headlines: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=5.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            tasks = [client.get(url) for url in _DAILY_SUMMARY_FEEDS]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        for resp in responses:
            if isinstance(resp, Exception) or resp.status_code != 200:
                continue
            root = ET.fromstring(resp.text)
            channel = root.find("channel") or root
            for item in channel.findall("item")[:6]:
                title = (item.findtext("title") or "").strip()
                if " - " in title:
                    title = title.rsplit(" - ", 1)[0].strip()
                if title:
                    headlines.append(title)
            if len(headlines) >= limit:
                break
    except Exception as e:
        _logger.warning("[DailySummary] Haber çekimi: %s", e)
    return headlines[:limit]


@router.get("/ai/daily-summary")
@limiter.limit("30/minute")
async def ai_daily_summary(
    request: Request,
    language: str = "tr",
    current_user: User = Depends(get_current_user),
):
    """
    Günlük piyasa nabzı: Groq Llama 3.3 70B ile 2-3 cümlelik market pulse.
    Güncel RSS haber başlıkları bağlam olarak verilir.
    language parametresi (tr/en) AI yanıt dilini belirler.
    Sonuçlar dil bazlı Redis cache'e kaydedilir: wt:ai:daily_summary_{lang}:{date}
    """
    is_english = language.startswith("en")
    today = datetime.date.today().isoformat()
    # 'en-US' → 'en', 'tr-TR' → 'tr' normalize et
    lang_norm = "en" if is_english else language.split("-")[0].lower()
    # Saati de key'e ekle: dil değişince eski cache bypass edilsin (1 saat TTL ile uyumlu)
    current_hour = datetime.datetime.now().hour
    cache_key = f"daily_summary_{today}_{lang_norm}_{current_hour}"

    # Önbellek hit — aynı dil+saat için önceden üretilmiş özet varsa doğrudan döndür
    cached_summary = cache_get(cache_key)
    if cached_summary:
        return {"summary": cached_summary}

    try:
        headlines = await _fetch_headlines(limit=8)
        if is_english:
            news_block = ("\n".join(f"- {h}" for h in headlines)) if headlines else ""
            headline_section = f"\n\nLATEST NEWS:\n{news_block}" if news_block else ""
            prompt = (
                "[CRITICAL INSTRUCTION: If language is en, YOU MUST RESPOND IN ENGLISH. "
                "RESPOND IN ENGLISH ONLY — NO TURKISH WORDS WHATSOEVER] "
                "You are a professional ICT/SMC crypto and macro economics analyst. "
                "Summarize today's overall market sentiment in 2-3 short, sharp sentences. "
                "Clearly state whether it is BULLISH, BEARISH, or NEUTRAL. "
                "Highlight any upcoming critical macro events if relevant."
                + headline_section
            )
        else:
            news_block = ("\n".join(f"- {h}" for h in headlines)) if headlines else ""
            headline_section = f"\n\nGÜNCEL HABERLER:\n{news_block}" if news_block else ""
            prompt = (
                "[YALNIZCA TÜRKÇE YAZI] "
                "Sen profesyonel bir ICT/SMC kripto ve makro ekonomi analistisin. "
                "Bugünün piyasa durumunu 2-3 kısa, keskin cümleyle özetle. "
                "BULLISH, BEARISH veya NÖTR olduğunu açıkça belirt. "
                "Gerekirse yaklaşan kritik makro olayları vurgula."
                + headline_section
            )

        system_msg = (
            "You are a professional financial analyst. "
            "YOU ARE AN ENGLISH EXPERT. YOU MUST RESPOND STRICTLY AND ENTIRELY IN ENGLISH. NO TURKISH ALLOWED. "
            "Every single word must be in English. Never use any Turkish words or phrases."
            if is_english else
            "Sen profesyonel bir finansal analistsin. KESİNLİKLE YALNIZCA Türkçe yanıt ver. Başka dil kullanma."
        )
        response = _groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.4,
        )
        summary = (response.choices[0].message.content or "").strip()

        # Dil bazlı cache'e yaz — aynı gün içinde 1 saatlik TTL
        cache_set(cache_key, summary, ttl_seconds=3600)

        return {"summary": summary}
    except Exception as e:
        _logger.error("[DailySummary] Hata: %s", e)
        error_msg = (
            "Market data temporarily unavailable. Please try again shortly."
            if is_english
            else "Piyasa verisi geçici olarak alınamadı. Lütfen kısa süre içinde tekrar deneyin."
        )
        return {"summary": error_msg}


@router.post("/ai-chat")
@limiter.limit("20/minute")
def ai_chat(request: Request, data: ChatMessage, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        trades = db.query(TradeLog).filter(
            TradeLog.user_id == current_user.id
        ).order_by(TradeLog.id.desc()).limit(50).all()

        closed_trades = [t for t in trades if t.status == "CLOSED"]
        open_trades = [t for t in trades if t.status == "OPEN"]

        win_count = len([t for t in closed_trades if (t.pnl or 0) > 0])
        loss_count = len(closed_trades) - win_count
        total_pnl = sum(t.pnl or 0 for t in closed_trades)
        win_rate = (win_count / len(closed_trades) * 100) if closed_trades else 0
        
        # Varlık sınıfı ve vade analizi
        margin_trades = [t for t in trades if t.trade_type == "MARGIN"]
        spot_trades = [t for t in trades if t.trade_type == "SPOT"]

        trade_summary = f"""
TRADER PROFİLİ:
- İsim: {current_user.full_name}
- Toplam İşlem: {len(closed_trades)} kapalı, {len(open_trades)} açık
- Vade Dağılımı: {len(margin_trades)} Kısa Vade (Kaldıraçlı/DayTrade), {len(spot_trades)} Uzun Vade (Spot/Yatırım)
- Win Rate: %{win_rate:.1f}
- Toplam PnL: ${total_pnl:.2f}
- Kazanan: {win_count} | Kaybeden: {loss_count}

AÇIK İŞLEMLER (Korelasyon Analizi İçin):
"""
        if not open_trades:
            trade_summary += "- Açık işlemin yok.\n"
        for t in open_trades:
            trade_summary += f"- Parite: {t.symbol} | Tür: {t.trade_type} | Giriş: ${t.entry_price}\n"

        trade_summary += "\nKAPALI İŞLEMLER (Seans, Zaman ve Psikoloji Isı Haritası İçin):\n"
        for t in closed_trades[:30]:
            trade_time = t.date.strftime("%A %H:%M") if t.date else "Bilinmiyor"
            trade_summary += f"- {t.symbol}: {'KÂR' if (t.pnl or 0) > 0 else 'ZARAR'} ${t.pnl or 0} | Zaman: {trade_time} | Not: {t.strategy_note[:30] if t.strategy_note else ''} {t.psychology_note[:30] if t.psychology_note else ''}\n"

        dna_block = _build_dna_instruction(current_user.trader_profile)
        
        system_instruction = f"""Sen WhaleTracker'ın ARIA'sısın — Advanced Risk & Intelligence Analyst.
Kullanıcının gerçek hesap verilerini, açık pozisyonlarını ve trade geçmişini görüyorsun.
Bu verilere dayalı olarak kurumsal düzeyde, somut ve uygulanabilir analizler yapıyorsun.

UZMANLIK ALANLARIN:
• ICT/SMC: Order blocks, fair value gaps, liquidity sweeps, CHOCH/BOS, killzone timing
• Makro analiz: Fed/ECB kararları, DXY korelasyonu, risk-on/risk-off rejim tespiti
• Trader psikolojisi: FOMO, intikam trade, overtrading kalıplarını veriden tespit et
• Risk yönetimi: Pozisyon boyutlama, portföy korelasyonu, drawdown optimizasyonu
• Çoklu varlık: Kripto, Forex, endeksler, emtialar, hisse senedi, temettü

KESIN KURALLAR:
1. "Belki", "muhtemelen", "olabilir" kullanma. Somut ve kararlı konuş.
2. Kullanıcının istatistiklerine doğrudan atıfta bulun (Win Rate, PnL, streak).
3. Açık pozisyon varsa korelasyon riski varsa mutlaka belirt.
4. Yanıt maksimum 220 kelime. Madde madde veya kısa paragraf formatı.
5. Spekülatif fiyat tahmini yapma; karar çerçevesi ver.
{"Respond ONLY in English. No Turkish words whatsoever." if data.lang == "EN" else "Tüm yanıtı Türkçe yaz."}{dna_block}

{trade_summary}"""

        # Groq OpenAI-uyumlu format: system + history + current message
        openai_messages = [{"role": "system", "content": system_instruction}]

        # Geçmiş mesajlar — yalnızca metin (resimler geçmişe dahil edilmez)
        for msg in (data.history or []):
            role = "user" if msg["role"] == "user" else "assistant"
            if isinstance(msg["content"], str):
                content = msg["content"]
            else:
                content = " ".join(
                    item["text"] for item in msg["content"]
                    if item.get("type") == "text"
                )
            if content:
                openai_messages.append({"role": role, "content": content})

        # Mevcut kullanıcı mesajı (resim varsa vision modeli seç)
        model = "llama-3.3-70b-versatile"
        if data.image:
            try:
                current_content = [
                    {"type": "text", "text": data.message},
                    {"type": "image_url", "image_url": {"url": data.image}},
                ]
                model = "meta-llama/llama-4-maverick-17b-128e-instruct"
            except Exception:
                current_content = data.message
        else:
            current_content = data.message

        openai_messages.append({"role": "user", "content": current_content})

        response = _groq_client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=1024,
            temperature=0.7,
        )
        reply_text = response.choices[0].message.content or ""
        return {"status": "ok", "reply": reply_text}

    except Exception as e:
        error_type = type(e).__name__
        error_str = str(e).lower()
        full_trace = traceback.format_exc()

        # P0 FIX: Her hata durumunu ayrı ayrı logla — sunucu loglarında net görünsün
        _logger.error(
            "[AI Chat] HATA | Tür: %s | Kullanıcı: %s | Mesaj: %s\nTRACEBACK:\n%s",
            error_type,
            getattr(current_user, "email", "bilinmiyor"),
            str(e),
            full_trace,
        )

        # Hata türüne göre net, eyleme dönüştürülebilir mesaj üret
        if not os.getenv("GROQ_API_KEY"):
            user_msg = "API Bağlantı Hatası: GROQ_API_KEY ortam değişkeni ayarlanmamış. Sunucu loglarını kontrol edin."
            _logger.critical("[AI Chat] GROQ_API_KEY eksik! Backend .env dosyasını kontrol et.")
        elif any(k in error_str for k in ("api_key", "401", "permission denied", "invalid api", "authentication")):
            user_msg = "API Bağlantı Hatası: GROQ_API_KEY geçersiz (401). Sunucu loglarını kontrol edin."
        elif any(k in error_str for k in ("429", "quota", "rate limit", "rate_limit_exceeded")):
            user_msg = "API Bağlantı Hatası: Günlük API kotası aşıldı (429). Sunucu loglarını kontrol edin."
        elif any(k in error_str for k in ("timeout", "timed out")):
            user_msg = "API Bağlantı Hatası: Groq API yanıt vermedi (Timeout). Sunucu loglarını kontrol edin."
        elif any(k in error_str for k in ("unavailable", "503", "service unavailable")):
            user_msg = "API Bağlantı Hatası: Groq servisi geçici olarak kullanılamıyor (503). Sunucu loglarını kontrol edin."
        elif any(k in error_str for k in ("connection", "network", "name or service")):
            user_msg = "API Bağlantı Hatası: Sunucudan Groq'a ağ bağlantısı kurulamadı. Sunucu loglarını kontrol edin."
        else:
            user_msg = f"API Bağlantı Hatası: {error_type} — Lütfen sunucu loglarını kontrol edin."

        return {"status": "error", "reply": user_msg, "error_type": error_type}

@router.post("/analyze-setup")
@limiter.limit("20/minute")
def analyze_setup(request: Request, data: SetupAnalyzeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        risk_amount = data.balance * (data.risk / 100)
        direction = "LONG" if data.entry_price > data.stop_loss else "SHORT"
        
        open_trades = db.query(TradeLog).filter(
            TradeLog.user_id == current_user.id, TradeLog.status == "OPEN"
        ).all()
        
        open_positions_text = "Şu an açık işlemin yok."
        if open_trades:
            open_positions_text = "\n".join([f"- {t.symbol} ({t.trade_type} - Giriş: ${t.entry_price})" for t in open_trades])

        dna_block = _build_dna_instruction(current_user.trader_profile)
        dna_context = f"\n{dna_block.strip()}" if dna_block else ""

        text_prompt = f"""Sen kurumsal bir risk yöneticisi ve ICT/SMC sertifikalı analistsin.{dna_context}
Aşağıdaki işlem setup'ını girmeden önce dört kritik perspektiften incele. Kısa, keskin, otoriter yaz.

AÇIK POZİSYONLARIM (korelasyon/kümülatif risk için):
{open_positions_text}

YENİ SETUP:
• Parite: {data.symbol}  |  Yön: {direction}
• Giriş: ${data.entry_price}  |  Stop: ${data.stop_loss}
• Risk: ${risk_amount:.2f}  (kasanın %{data.risk:.1f}'i)
• R/R Oranı: {abs((data.entry_price - data.stop_loss) / data.stop_loss * 100):.2f}%  stop mesafesi

ZORUNLU ANALİZ FORMATI — bu başlıkların TAMAMI olacak:
🔍 **Yapısal Okuma:** HTF bias nedir? Stop, gerçek bir likidite seviyesinin arkasında mı?
⚠️ **Risk & Korelasyon:** Açık pozisyonlarla yön/varlık çakışması var mı? Kümülatif risk kabul edilebilir mi?
🎯 **Hedef Yönetimi:** İlk TP nerede alınmalı? Trailing stop mantıklı mı?
💡 **Karar:** GİR / PASS / BEKLE + tek cümle gerekçe.

{"Respond in English." if data.lang == "EN" else "Türkçe yanıt ver."}"""
        
        setup_model = "llama-3.3-70b-versatile"
        if data.image:
            try:
                setup_content = [
                    {"type": "text", "text": text_prompt},
                    {"type": "image_url", "image_url": {"url": data.image}},
                ]
                setup_model = "meta-llama/llama-4-maverick-17b-128e-instruct"
            except Exception:
                setup_content = text_prompt
        else:
            setup_content = text_prompt

        response = _groq_client.chat.completions.create(
            model=setup_model,
            messages=[{"role": "user", "content": setup_content}],
            max_tokens=1024,
            temperature=0.7,
        )
        analysis_text = response.choices[0].message.content or ""
        return {"status": "ok", "analysis": analysis_text}
    except Exception as e:
        _logger.error("[AI] Pre-trade analiz hatası: %s", e)
        return {"status": "error", "analysis": "Analiz yapılamadı, lütfen tekrar dene."}