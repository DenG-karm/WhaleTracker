from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import os
import json
import logging
from groq import Groq
import google.genai as genai
from google.genai import types as genai_types

from database import get_db
from models import ChatSession, ChatMessage, User, TradeLog
from auth import get_current_user
from cache import cache_get

# Lazy init: import anında GROQ_API_KEY boşsa AuthenticationError fırlatmasın
_groq_client: Groq | None = None
_gemini_client: genai.Client | None = None

def _get_groq() -> Groq:
    """Groq istemcisini ilk kullanımda başlatır (lazy init)."""
    global _groq_client
    if _groq_client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY ortam değişkeni ayarlanmamış.")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def _get_gemini() -> genai.Client | None:
    """Gemini istemcisini başlatır; anahtar yoksa None döner."""
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


# ── Yardımcı: Trader DNA talimatı ─────────────────────────────────────────────
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


# ── Yardımcı: Kullanıcı istatistikleri ───────────────────────────────────────
def _build_user_context(user: User, db: Session) -> str:
    """Kullanıcının gerçek zamanlı hesap verilerini derinlemesine analiz ederek zengin bağlam metni üretir."""
    try:
        trades = (
            db.query(TradeLog)
            .filter(TradeLog.user_id == user.id)
            .order_by(TradeLog.date.desc())
            .limit(50)
            .all()
        )
        closed = [t for t in trades if t.status == "CLOSED"]
        open_trades = [t for t in trades if t.status == "OPEN"]

        total_pnl = sum(float(t.pnl or 0) for t in closed)
        wins = [t for t in closed if float(t.pnl or 0) > 0]
        losses = [t for t in closed if float(t.pnl or 0) <= 0]
        win_rate = (len(wins) / len(closed) * 100) if closed else 0
        avg_win = sum(float(t.pnl or 0) for t in wins) / len(wins) if wins else 0
        avg_loss = sum(float(t.pnl or 0) for t in losses) / len(losses) if losses else 0
        rr_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else 0

        # Seri analizi (streak)
        streak = 0
        streak_type = ""
        for t in closed:
            val = float(t.pnl or 0)
            if streak == 0:
                streak = 1
                streak_type = "WIN" if val > 0 else "LOSS"
            elif (val > 0 and streak_type == "WIN") or (val <= 0 and streak_type == "LOSS"):
                streak += 1
            else:
                break
        streak_text = f"{streak} art arda {streak_type}" if streak else "veri yok"

        # Psikoloji kalıbı: intikam trade, overtrading, disiplin skoru
        revenge_keywords = ["sinir", """intikam""", "duygusal", "aşırı", "panik", "korku", "hata"]
        revenge_count = sum(
            1 for t in closed
            if any(k in (t.psychology_note or "").lower() for k in revenge_keywords)
        )
        max_single_loss = min((float(t.pnl or 0) for t in losses), default=0)
        discipline_score = max(0, 100 - (revenge_count * 15) - (max(0, 3 - rr_ratio) * 10))

        # En iyi/kötü sembol
        symbol_pnl: dict = {}
        for t in closed:
            sym = t.symbol or "UNKNOWN"
            symbol_pnl[sym] = symbol_pnl.get(sym, 0) + float(t.pnl or 0)
        best_sym = max(symbol_pnl, key=symbol_pnl.get) if symbol_pnl else "N/A"
        worst_sym = min(symbol_pnl, key=symbol_pnl.get) if symbol_pnl else "N/A"

        lines = [
            "═" * 40,
            "KULLANICI HESAP RAPORU (Canlı Veri)",
            "═" * 40,
            f"Ad: {user.full_name or 'Bilinmiyor'}",
            f"Toplam PnL: ${total_pnl:+.2f}",
            f"Kazanç Oranı: %{win_rate:.1f}  ({len(wins)}W / {len(losses)}L)",
            f"Ortalama Kazanç: ${avg_win:.2f}  |  Ortalama Kayıp: ${avg_loss:.2f}",
            f"Risk/Ödül Oranı: {rr_ratio:.2f}R",
            f"Mevcut Seri: {streak_text}",
            f"En Büyük Tek Kayıp: ${max_single_loss:.2f}",
            f"Disiplin Skoru: {discipline_score:.0f}/100",
            f"Duygusal Trade Sayısı: {revenge_count}",
            f"En Kazançlı Sembol: {best_sym} (${symbol_pnl.get(best_sym, 0):.2f})",
            f"En Kayıplı Sembol: {worst_sym} (${symbol_pnl.get(worst_sym, 0):.2f})",
            f"Toplam İşlem: {len(closed)} kapalı | {len(open_trades)} açık",
        ]

        if open_trades:
            lines.append("\nAÇIK POZİSYONLAR:")
            for t in open_trades:
                lines.append(f"  {t.symbol} | Giriş: ${float(t.entry_price or 0):.4f} | {t.trade_type}")

        if closed[:7]:
            lines.append("\nSON 7 KAPALI İŞLEM:")
            for t in closed[:7]:
                pnl_val = float(t.pnl or 0)
                tag = "KAR" if pnl_val > 0 else "ZARAR"
                dt = t.date.strftime("%d.%m %H:%M") if t.date else "?"
                psych = f" | Psikoloji: {t.psychology_note[:40]}" if t.psychology_note else ""
                lines.append(f"  {t.symbol} {tag} ${pnl_val:+.2f} | {t.trade_type} | {dt}{psych}")

        lines.append("═" * 40)
        return "\n".join(lines)
    except Exception as exc:
        _logger.warning("[ChatContext] Kullanıcı verisi çekilemedi: %s", exc)
        return ""


# ── Yardımcı: Redis'ten güncel piyasa özeti ───────────────────────────────────
def _get_market_sentiment() -> str:
    """Redis cache'den güncel piyasa duyarlılığı özetini çeker."""
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        current_hour = datetime.now(timezone.utc).hour
        for hour in (current_hour, (current_hour - 1) % 24):
            for lang in ("tr", "en"):
                val = cache_get(f"daily_summary_{today}_{lang}_{hour}")
                if val:
                    return str(val)
    except Exception as exc:
        _logger.warning("[ChatContext] Piyasa duyarlılığı alınamadı: %s", exc)
    return ""


# ── Ana chat sistem promptu ─────────────────────────────────────────────────────
_CORE_SYSTEM_PROMPT = """\
Sen WhaleTracker'{ın ARIA'şısın — Advanced Risk & Intelligence Analyst.
Görevin: Kullanıcıyı profesyonel bir traderdan üstün bir traderha dönüştürmek.
Tonun: Sert ama adil bir mentor. Kuru kuruya övmezsin, yanlışlıkları açıkça söylersin.

EKSPERTEZ ALANLARIN:
• ICT/SMC: Order blocks, FVG, liquidity sweeps, CHOCH/BOS, PD arrays, killzone timing
• Makro: Fed/ECB politikaları, DXY korelasyonu, risk-on/risk-off rejimler
• Psikoloji: FOMO, intikam trade, overtrading, kayıp korkusu — bunları veriden tespit edersin
• Risk: Kelly criterion, pozisyon boyutlama, portföy korelasyonu, max drawdown optimizasyonu
• Çoklu varlık: Kripto, Forex, endeksler, emtialar, hisse senedi, temettü

KESİN KURALLAR:
1. Hiçbir zaman "belki", "muhtemelen", "olabilir" kullanma. Kararlı ve net konuş.
2. Kullanıcının HARI verilerini (PnL, streak, disiplin skoru) analizine entüe et.
3. Eğer disiplin skoru 60'tan düşükse bunu söyle ve nedenini açıkla.
4. Açık pozisyon varsa her cevaba o pozisyonun durumuna dair bir satır ekle.
5. Setup sorarında: mutlaka Risk/Ödül oranı, stop geçerliliği ve korelasyon kontrol et.
6. Yanıtlar maksimum 250 kelime olsun. Madde madde veya kısa paragraf şeklinde yaz.
7. Spekulatif fiyat tahmini yapma. Analiz ve karar cercevesi ver.
"Alacak miyim?", "duser mi?" sorularina direk cevap verme; bunun yerine karar verecek soruyu sor.
"""

# ── Pydantic Schemas ─────────────────────────────────────────────


class NewSessionRequest(BaseModel):
    title: str = "Yeni Sohbet"


class RenameSessionRequest(BaseModel):
    title: str


class SendMessageRequest(BaseModel):
    message: str
    lang: Optional[str] = "tr"


class SessionOut(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


# ── List sessions ─────────────────────────────────────────────────────────────
@router.get("/sessions")
def list_sessions(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == current_user.id,
            ChatSession.is_archived == False,
        )
        .order_by(desc(ChatSession.updated_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


# ── Create session ────────────────────────────────────────────────────────────
@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    payload: NewSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ChatSession(user_id=current_user.id, title=payload.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


# ── Archive session ───────────────────────────────────────────────────────────
@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_archived = True
    db.commit()
    return {"ok": True}


# ── Rename session ────────────────────────────────────────────────────────────
@router.put("/sessions/{session_id}/rename")
def rename_session(
    session_id: int,
    payload: RenameSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = payload.title.strip()
    db.commit()
    return {"id": session.id, "title": session.title}


# ── Get session messages ──────────────────────────────────────────────────────
@router.get("/sessions/{session_id}/messages")
def get_messages(
    session_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


# ── Send message (calls Gemini, persists to DB) ───────────────────────────────
@router.post("/sessions/{session_id}/messages")
def send_message(
    session_id: int,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.is_archived == False,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Persist user message
    user_msg = ChatMessage(
        session_id=session_id,
        user_id=current_user.id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    db.flush()

    # Build context from recent history (last 20 messages)
    history_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
        .all()
    )

    reply_text = ""
    new_title = None
    is_en = (payload.lang or "tr").lower().startswith("en")

    # ── Dinamik bağlam toplama ─────────────────────────────────────────────────
    user_context = _build_user_context(current_user, db)
    market_sentiment = _get_market_sentiment()
    dna_block = _build_dna_instruction(getattr(current_user, "trader_profile", None))

    lang_instruction = (
        "\n\nCRITICAL: Respond ONLY in English. Zero Turkish words allowed."
        if is_en
        else "\n\nDİL KURALI: Yanıtın tamamı Türkçe olacak. İngilizce kelime kullanma."
    )

    context_block = ""
    if user_context:
        context_block += f"\n\n{user_context}"
    if market_sentiment:
        context_block += f"\n\n─── GÜNCEL PİYASA SENTİMENTI ───\n{market_sentiment}"
    if dna_block:
        context_block += dna_block

    full_system = _CORE_SYSTEM_PROMPT + context_block + lang_instruction

    # Sohbet geçmişini mesaj listesine dönüştür
    groq_messages = [{"role": "system", "content": full_system}]
    for m in history_msgs:
        groq_messages.append({
            "role": "user" if m.role == "user" else "assistant",
            "content": m.content,
        })

    try:
        # ── Birincil: Gemini 2.5 Flash ────────────────────────────────────────
        gemini = _get_gemini()
        if gemini:
            try:
                # Geçmişi Gemini formatına çevir
                gemini_history = []
                for m in history_msgs[:-1]:  # son mesaj (kullanıcının şimdiki sorusu) hariç
                    gemini_history.append(
                        genai_types.Content(
                            role="user" if m.role == "user" else "model",
                            parts=[genai_types.Part(text=m.content)],
                        )
                    )
                chat = gemini.chats.create(
                    model="gemini-2.5-flash",
                    config=genai_types.GenerateContentConfig(
                        system_instruction=full_system,
                        temperature=0.65,
                        max_output_tokens=1200,
                    ),
                    history=gemini_history,
                )
                gemini_resp = chat.send_message(payload.message)
                reply_text = (gemini_resp.text or "").strip()
                _logger.debug("[Chat] Gemini 2.5 Flash yanıtladı.")
            except Exception as ge:
                _logger.warning("[Chat] Gemini başarısız, Groq'a düşülüyor: %s", ge)
                reply_text = ""

        # ── Fallback: Groq llama-3.3-70b ─────────────────────────────────────
        if not reply_text:
            groq_resp = _get_groq().chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=groq_messages,
                max_tokens=1200,
                temperature=0.65,
            )
            reply_text = (groq_resp.choices[0].message.content or "").strip()
            _logger.debug("[Chat] Groq llama-3.3-70b yanıtladı.")

        # ── Auto-titling ──────────────────────────────────────────────────────
        first_user_msgs = [m for m in history_msgs if m.role == "user"]
        if session.title in ("Yeni Sohbet", "New Chat") and len(first_user_msgs) <= 1:
            try:
                title_prompt = (
                    "Reply ONLY with a 3-4 word English chat title, no punctuation: "
                    if is_en else
                    "Sadece 3-4 kelimelik Türkçe başlık yaz, noktalama işareti yok: "
                )
                title_resp = _get_groq().chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": title_prompt + payload.message[:200]}],
                    max_tokens=20,
                    temperature=0.2,
                )
                generated = (title_resp.choices[0].message.content or "").strip()[:80]
                if generated:
                    session.title = generated
                    new_title = generated
            except Exception as te:
                _logger.warning("[AutoTitle] Hata: %s", te)
                session.title = payload.message[:50].strip()
                new_title = session.title

    except Exception as e:
        _logger.error("[Chat] Tüm modeller başarısız: %s", e)
        reply_text = (
            "I'm temporarily unavailable. Please try again in a moment."
            if is_en
            else "Şu an yanıt veremiyorum, lütfen tekrar deneyin."
        )

    # Persist assistant reply
    assistant_msg = ChatMessage(
        session_id=session_id,
        user_id=current_user.id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)

    # Update session timestamp
    session.updated_at = datetime.now(timezone.utc)

    db.commit()

    return {"role": "assistant", "content": reply_text, "session_title": new_title}
