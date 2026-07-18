from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
import os
import base64
import uuid
import logging
import statistics
import json
from database import get_db
from models import User, TradeLog
from auth import get_current_user
import google.genai as genai

from .news_router import get_alerts

router = APIRouter()
_logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "../uploads")
ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]
MAX_FILE_SIZE_MB = 5


class TradeCreate(BaseModel):
    title: str
    symbol: str
    trade_type: str = "MARGIN"
    account_balance: Decimal
    risk_percentage: Decimal
    entry_price: Decimal
    stop_loss: Optional[Decimal] = None
    position_size: Optional[Decimal] = None
    strategy_note: str
    psychology_note: str
    risk_note: str
    screenshot: Optional[str] = None


class TradeClose(BaseModel):
    trade_id: int
    exit_price: Decimal
    close_note: Optional[str] = ""


def save_base64_image(base64_str: str) -> str:
    if not base64_str:
        return None
    try:
        if "," in base64_str:
            header, encoded = base64_str.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0] if ":" in header else ""
            if mime_type not in ALLOWED_MIME_TYPES:
                return None
        else:
            encoded = base64_str
        decoded = base64.b64decode(encoded)
        if len(decoded) > MAX_FILE_SIZE_MB * 1024 * 1024:
            return None
        filename = f"{uuid.uuid4().hex}.png"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(decoded)
        return f"http://127.0.0.1:8000/uploads/{filename}"
    except Exception as e:
        _logger.warning("[Trades] Görsel kaydedilirken hata: %s", e)
        return None


def generate_trade_feedback(trade: TradeCreate) -> str:
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        prompt = f"""Sen WhaleTracker'ın AI koçusun. Bir trader'ın yeni açtığı işlemi analiz edeceksin.

İŞLEM BİLGİLERİ:
- Parite: {trade.symbol}
- Giriş Fiyatı: {trade.entry_price}
- Stop Loss: {trade.stop_loss}
- Risk Yüzdesi: %{trade.risk_percentage}
- Hesap Bakiyesi: ${trade.account_balance}
- Risk Miktarı: ${trade.account_balance * trade.risk_percentage / 100:.2f}

TRADER'IN NOTLARI:
- Strateji: {trade.strategy_note}
- Psikoloji: {trade.psychology_note}
- Risk Notu: {trade.risk_note}

Lütfen şu başlıklar altında kısa ve net analiz yap:
🎯 **STRATEJİ ANALİZİ:**
🧠 **PSİKOLOJİ ANALİZİ:**
⚠️ **RİSK DEĞERLENDİRMESİ:**
💡 **KOÇLUK TAVSİYESİ:**

Türkçe yaz. Samimi, direkt ve yapıcı ol. Toplam 150-200 kelime."""

        response = client.models.generate_content(model="gemini-1.5-pro", contents=prompt)
        return response.text
    except Exception as e:
        _logger.error("[Trades] AI Analizi Hatası: %s", e)
        return "Sistem geçici olarak analiz yapamıyor."


@router.post("/save-trade")
def save_trade(data: TradeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tip Dönüşümü: Decimal garantisi
    account_balance = Decimal(str(data.account_balance)) if not isinstance(data.account_balance, Decimal) else data.account_balance
    risk_percentage = Decimal(str(data.risk_percentage)) if not isinstance(data.risk_percentage, Decimal) else data.risk_percentage
    risk_usd = account_balance * (risk_percentage / Decimal("100"))
    
    ai = generate_trade_feedback(data)
    image_url = save_base64_image(data.screenshot)

    # 🌟 YENİ: İşlem anındaki ilgili makro verileri çek (sync version kullanıyoruz)
    try:
        # Makro veriler async olmadığı için skip ediyoruz veya sync endpoint'e çeviriyoruz
        macro_events_json = None
    except Exception as e:
        _logger.warning("[Trades] Makro veri çekme hatası: %s", e)
        macro_events_json = None

    db.add(TradeLog(
        user_id=current_user.id,
        trade_type=data.trade_type,
        title=data.title,
        symbol=data.symbol,
        entry_price=Decimal(str(data.entry_price)) if data.entry_price else Decimal("0"),
        stop_loss=Decimal(str(data.stop_loss)) if data.stop_loss else None,
        position_size=Decimal(str(data.position_size)) if data.position_size else None,
        risk_amount=risk_usd,
        risk_percentage=risk_percentage,
        strategy_note=data.strategy_note or "",
        psychology_note=data.psychology_note or "",
        risk_note=data.risk_note or "",
        screenshot=image_url,
        ai_feedback=ai,
        macro_events=macro_events_json
    ))
    db.commit()
    return {"status": "saved", "ai_msg": ai, "trade_id": db.query(TradeLog).filter(TradeLog.user_id == current_user.id).order_by(TradeLog.id.desc()).first().id}


@router.get("/trades")
def get_trades(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(TradeLog).filter(TradeLog.user_id == current_user.id).order_by(TradeLog.id.desc()).all()


@router.post("/calculate-risk")
def calculate_risk(data: TradeCreate):
    risk_usd = data.account_balance * (data.risk_percentage / Decimal("100"))
    return {"suggested_lot_size": 0.1, "risk_amount_usd": risk_usd}


@router.post("/close-trade")
def close_trade(data: TradeClose, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(TradeLog).filter(TradeLog.id == data.trade_id, TradeLog.user_id == current_user.id).first()
    if t:
        try:
            if t.trade_type == "SPOT" and t.position_size:
                # Spot işlem kâr/zarar hesaplaması: (Çıkış - Giriş) * Miktar
                pnl_raw = (data.exit_price - t.entry_price) * t.position_size
                t.pnl = round(pnl_raw, 2)
            else:
                # Kaldıraçlı (Margin) işlem kâr/zarar hesaplaması (Risk Bazlı)
                denom = abs(t.entry_price - (t.stop_loss or Decimal("0")))
                if denom == 0 or not t.risk_amount:
                    t.pnl = Decimal("0")
                else:
                    direction = Decimal("1") if t.entry_price > (t.stop_loss or Decimal("0")) else Decimal("-1")
                    r = (data.exit_price - t.entry_price) * direction / denom
                    t.pnl = round(r * t.risk_amount, 2)
            t.status = "CLOSED"
            t.exit_price = data.exit_price
            t.close_note = data.close_note
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Trade close failed: {str(e)}")
    return {"status": "closed"}


@router.get("/stats")
def get_pro_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trades = db.query(TradeLog).filter(
        TradeLog.user_id == current_user.id,
        TradeLog.status == "CLOSED"
    ).order_by(TradeLog.date.asc()).all()

    _empty = {
        "summary": {
            "total_trades": 0, "total_pnl": 0.0, "win_rate": 0.0, "profit_factor": 0.0,
            "max_drawdown": 0.0, "max_drawdown_duration_days": 0, "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0, "expected_value": 0.0, "recovery_factor": 0.0,
            "average_win": 0.0, "average_loss": 0.0, "best_trade": 0.0, "worst_trade": 0.0
        },
        "equity_curve": [], "symbol_performance": [], "r_distribution": [],
        "session_analysis": [], "weekday_analysis": [], "holding_analysis": [], "mental_leakage": {}
    }
    if not trades:
        return _empty

    pnls = [float(t.pnl) for t in trades if t.pnl is not None]
    if not pnls:
        return _empty

    wins   = [p for p in pnls if p > 0]
    losses = [abs(p) for p in pnls if p < 0]
    gross_profit = sum(wins)
    gross_loss   = sum(losses)

    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (round(gross_profit, 2) if gross_profit > 0 else 0.0)
    win_rate      = round(len(wins) / len(pnls) * 100, 2) if pnls else 0.0
    avg_win       = round(gross_profit / len(wins),   2) if wins   else 0.0
    avg_loss      = round(gross_loss   / len(losses), 2) if losses else 0.0
    best_trade    = max(pnls) if pnls else 0.0
    worst_trade   = min(pnls) if pnls else 0.0
    total_pnl_val = round(sum(pnls), 2)

    # Equity Curve + Max Drawdown + Drawdown Süresi
    peak = current_balance = max_dd = 0.0
    in_drawdown = False
    drawdown_start = None
    max_drawdown_duration_days = 0
    equity_curve = []
    symbol_stats = {}

    for t in trades:
        if t.pnl is None:
            continue
        p = float(t.pnl)
        current_balance += p
        if current_balance > peak:
            if in_drawdown and drawdown_start and t.date:
                dur = (t.date - drawdown_start).days
                if dur > max_drawdown_duration_days:
                    max_drawdown_duration_days = dur
            in_drawdown = False
            drawdown_start = None
            peak = current_balance
        else:
            dd = peak - current_balance
            if dd > max_dd:
                max_dd = dd
            if not in_drawdown and dd > 0:
                in_drawdown = True
                drawdown_start = t.date

        equity_curve.append({
            "trade_id": t.id, "symbol": t.symbol,
            "date": t.date.strftime("%Y-%m-%d %H:%M") if t.date else None,
            "pnl": p, "balance": round(current_balance, 2)
        })
        sym = t.symbol
        if sym not in symbol_stats:
            symbol_stats[sym] = {"symbol": sym, "trades": 0, "win": 0, "loss": 0, "total_pnl": 0.0}
        symbol_stats[sym]["trades"] += 1
        symbol_stats[sym]["total_pnl"] += p
        if p > 0:
            symbol_stats[sym]["win"] += 1
        else:
            symbol_stats[sym]["loss"] += 1

    # Sharpe Ratio
    if len(pnls) > 1:
        mean_pnl = statistics.mean(pnls)
        std_pnl  = statistics.stdev(pnls)
        sharpe_ratio = round(mean_pnl / std_pnl, 2) if std_pnl > 0 else 0.0
    else:
        sharpe_ratio = 0.0

    # Sortino Ratio
    negative_pnls = [p for p in pnls if p < 0]
    if len(negative_pnls) > 1:
        downside_std  = statistics.stdev(negative_pnls)
        sortino_ratio = round(statistics.mean(pnls) / downside_std, 2) if downside_std > 0 else 0.0
    else:
        sortino_ratio = 0.0

    # R-Çarpanı Dağılımı
    r_buckets = {}
    BUCKET_ORDER = ["≤-3R", "-3R/-2R", "-2R/-1R", "-1R/0", "0/1R", "1R/2R", "2R/3R", "3R/5R", "5R+"]
    for t in trades:
        if t.pnl is None or not t.risk_amount or float(t.risk_amount) <= 0:
            continue
        r = float(t.pnl) / float(t.risk_amount)
        if r <= -3:   b = "≤-3R"
        elif r <= -2: b = "-3R/-2R"
        elif r <= -1: b = "-2R/-1R"
        elif r < 0:   b = "-1R/0"
        elif r < 1:   b = "0/1R"
        elif r < 2:   b = "1R/2R"
        elif r < 3:   b = "2R/3R"
        elif r < 5:   b = "3R/5R"
        else:          b = "5R+"
        r_buckets[b] = r_buckets.get(b, 0) + 1
    r_distribution = [{"range": b, "count": r_buckets[b]} for b in BUCKET_ORDER if b in r_buckets]

    # EV & Recovery Factor
    win_prob        = len(wins) / len(pnls) if pnls else 0
    ev              = round((win_prob * avg_win) - ((1 - win_prob) * avg_loss), 2)
    recovery_factor = round(total_pnl_val / max_dd, 2) if max_dd > 0 else 0.0

    # Session Analizi
    sess_map    = {"Asya": (0, 7), "Londra": (7, 12), "New York": (12, 20), "Geç Seans": (20, 24)}
    sess_stats  = {k: {"session": k, "trades": 0, "wins": 0, "total_pnl": 0.0} for k in sess_map}
    for t in trades:
        if t.date is None or t.pnl is None:
            continue
        h = t.date.hour
        s = next((k for k, (a, b) in sess_map.items() if a <= h < b), "Geç Seans")
        sess_stats[s]["trades"] += 1
        sess_stats[s]["total_pnl"] += float(t.pnl)
        if float(t.pnl) > 0:
            sess_stats[s]["wins"] += 1
    session_analysis = []
    for s in sess_stats.values():
        s["win_rate"] = round(s["wins"] / s["trades"] * 100, 1) if s["trades"] > 0 else 0
        s["avg_pnl"]  = round(s["total_pnl"] / s["trades"], 2)  if s["trades"] > 0 else 0
        session_analysis.append(s)

    # Gün Analizi
    day_names   = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    wday_stats  = {d: {"day": d, "trades": 0, "wins": 0, "total_pnl": 0.0} for d in day_names}
    for t in trades:
        if t.date is None or t.pnl is None:
            continue
        d = day_names[t.date.weekday()]
        wday_stats[d]["trades"] += 1
        wday_stats[d]["total_pnl"] += float(t.pnl)
        if float(t.pnl) > 0:
            wday_stats[d]["wins"] += 1
    weekday_analysis = []
    for d in day_names:
        s = wday_stats[d]
        s["win_rate"] = round(s["wins"] / s["trades"] * 100, 1) if s["trades"] > 0 else 0
        s["avg_pnl"]  = round(s["total_pnl"] / s["trades"], 2)  if s["trades"] > 0 else 0
        weekday_analysis.append(s)

    # Holding Time (risk % proxy)
    h_buckets = {
        "Scalp (≥3%)":      {"label": "Scalp (≥3%)", "trades": 0, "total_pnl": 0.0, "wins": 0},
        "Day Trade (2-3%)": {"label": "Day Trade (2-3%)", "trades": 0, "total_pnl": 0.0, "wins": 0},
        "Swing (1-2%)":     {"label": "Swing (1-2%)", "trades": 0, "total_pnl": 0.0, "wins": 0},
        "Uzun Vade (<1%)":  {"label": "Uzun Vade (<1%)", "trades": 0, "total_pnl": 0.0, "wins": 0},
    }
    for t in trades:
        if t.pnl is None:
            continue
        rp = float(t.risk_percentage) if t.risk_percentage else 1.0
        bk = "Scalp (≥3%)" if rp >= 3 else ("Day Trade (2-3%)" if rp >= 2 else ("Swing (1-2%)" if rp >= 1 else "Uzun Vade (<1%)"))
        h_buckets[bk]["trades"] += 1
        h_buckets[bk]["total_pnl"] += float(t.pnl)
        if float(t.pnl) > 0:
            h_buckets[bk]["wins"] += 1
    holding_analysis = []
    for hb in h_buckets.values():
        hb["win_rate"] = round(hb["wins"] / hb["trades"] * 100, 1) if hb["trades"] > 0 else 0
        hb["avg_pnl"]  = round(hb["total_pnl"] / hb["trades"], 2)  if hb["trades"] > 0 else 0
        holding_analysis.append(hb)

    # Mental Leakage
    rv_kw = ["intikam", "revenge", "telafi", "kızgın", "sinirli", "öfke", "acele", "panik"]
    fm_kw = ["fomo", "kaçırma", "hızlı", "atlama", "geç kaldım", "herkesler"]
    oc_kw = ["all in", "kesin", "garantili", "yüksel", "emin oldm", "şans"]
    rv_loss = rv_cnt = fm_loss = fm_cnt = oc_loss = oc_cnt = hr_loss = hr_cnt = 0.0

    for t in trades:
        if t.pnl is None:
            continue
        pv    = float(t.pnl)
        notes = ((t.psychology_note or "") + " " + (t.risk_note or "") + " " + (t.strategy_note or "")).lower()
        rp    = float(t.risk_percentage) if t.risk_percentage else 0
        if rp > 2:
            hr_cnt += 1
            if pv < 0:
                hr_loss += abs(pv)
        if any(k in notes for k in rv_kw):
            rv_cnt += 1
            if pv < 0: rv_loss += abs(pv)
        if any(k in notes for k in fm_kw):
            fm_cnt += 1
            if pv < 0: fm_loss += abs(pv)
        if any(k in notes for k in oc_kw):
            oc_cnt += 1
            if pv < 0: oc_loss += abs(pv)

    mental_leakage = {
        "revenge_trading":      {"count": int(rv_cnt), "total_loss": round(rv_loss, 2)},
        "fomo_trading":         {"count": int(fm_cnt), "total_loss": round(fm_loss, 2)},
        "overconfidence":       {"count": int(oc_cnt), "total_loss": round(oc_loss, 2)},
        "high_risk_violations": {"count": int(hr_cnt), "total_loss": round(hr_loss, 2)},
        "total_leakage":        round(rv_loss + fm_loss + oc_loss + hr_loss, 2)
    }

    sorted_symbols = []
    for s in sorted(symbol_stats.values(), key=lambda x: x["total_pnl"], reverse=True):
        s["win_rate"]  = round(s["win"] / s["trades"] * 100, 1) if s["trades"] > 0 else 0
        s["total_pnl"] = round(s["total_pnl"], 2)
        sorted_symbols.append(s)

    return {
        "summary": {
            "total_trades": len(pnls), "total_pnl": total_pnl_val,
            "win_rate": win_rate, "profit_factor": profit_factor,
            "max_drawdown": round(max_dd, 2),
            "max_drawdown_duration_days": max_drawdown_duration_days,
            "sharpe_ratio": sharpe_ratio, "sortino_ratio": sortino_ratio,
            "expected_value": ev, "recovery_factor": recovery_factor,
            "average_win": avg_win, "average_loss": avg_loss,
            "best_trade": round(best_trade, 2), "worst_trade": round(worst_trade, 2),
        },
        "equity_curve":    equity_curve,
        "symbol_performance": sorted_symbols,
        "r_distribution":  r_distribution,
        "session_analysis": session_analysis,
        "weekday_analysis": weekday_analysis,
        "holding_analysis": holding_analysis,
        "mental_leakage":   mental_leakage,
    }

