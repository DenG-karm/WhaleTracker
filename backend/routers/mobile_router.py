"""
routers/mobile_router.py — WhaleTracker Mobil Dashboard API
============================================================
Tek bir çağrıyla mobil uygulamanın ihtiyaç duyduğu tüm veriyi döner.
Birleşik endpoint, network latency'yi minimize eder.

Endpoint:
  GET /api/v1/mobile/dashboard
  GET /api/v1/mobile/journal?page=1&limit=20
  GET /api/v1/mobile/stats
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from cache import cache_get
from database import get_db
from models import User, TradeLog, UserGoal

router = APIRouter(prefix="/api/v1/mobile", tags=["mobile"])
_logger = logging.getLogger(__name__)

# ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

def _float(v) -> float | None:
    """Decimal veya None → float."""
    return float(v) if v is not None else None


def _compute_stats(trades: list[TradeLog]) -> dict[str, Any]:
    """Tüm işlemler üzerinden özet istatistik hesaplar."""
    closed = [t for t in trades if t.status == "CLOSED"]
    open_  = [t for t in trades if t.status == "OPEN"]

    if not closed:
        return {
            "total_trades": len(trades),
            "closed_trades": 0,
            "open_trades": len(open_),
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "profit_factor": 0.0,
            "current_streak": 0,
            "best_trade": None,
            "worst_trade": None,
        }

    wins  = [t for t in closed if (t.pnl or 0) > 0]
    losses = [t for t in closed if (t.pnl or 0) <= 0]

    total_pnl  = sum(float(t.pnl or 0) for t in closed)
    gross_win  = sum(float(t.pnl or 0) for t in wins)
    gross_loss = abs(sum(float(t.pnl or 0) for t in losses))

    # En uzun streak (son işlemlerden)
    streak = 0
    last_result = None
    for t in sorted(closed, key=lambda x: x.date or datetime.min, reverse=True):
        cur = "W" if (t.pnl or 0) > 0 else "L"
        if last_result is None:
            last_result = cur
        if cur == last_result:
            streak += 1
        else:
            break

    best  = max(closed, key=lambda t: float(t.pnl or 0), default=None)
    worst = min(closed, key=lambda t: float(t.pnl or 0), default=None)

    return {
        "total_trades": len(trades),
        "closed_trades": len(closed),
        "open_trades": len(open_),
        "win_rate": round(len(wins) / len(closed) * 100, 1) if closed else 0.0,
        "total_pnl": round(total_pnl, 2),
        "avg_win":  round(gross_win / len(wins), 2) if wins else 0.0,
        "avg_loss": round(-gross_loss / len(losses), 2) if losses else 0.0,
        "profit_factor": round(gross_win / gross_loss, 2) if gross_loss else 0.0,
        "current_streak": streak,
        "streak_type": last_result,      # "W" | "L" | None
        "best_trade": {
            "id": best.id, "symbol": best.symbol,
            "pnl": _float(best.pnl), "date": best.date.isoformat() if best.date else None,
        } if best else None,
        "worst_trade": {
            "id": worst.id, "symbol": worst.symbol,
            "pnl": _float(worst.pnl), "date": worst.date.isoformat() if worst.date else None,
        } if worst else None,
    }


def _money_flow(trades: list[TradeLog], days: int = 7) -> list[dict]:
    """Son N günün günlük P&L akışını döner."""
    now = datetime.now(timezone.utc)
    buckets: dict[str, float] = {}

    for i in range(days):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        buckets[day] = 0.0

    for t in trades:
        if t.status != "CLOSED" or not t.date:
            continue
        dt = t.date if t.date.tzinfo else t.date.replace(tzinfo=timezone.utc)
        if (now - dt).days > days:
            continue
        day_key = dt.strftime("%Y-%m-%d")
        if day_key in buckets:
            buckets[day_key] += float(t.pnl or 0)

    return [
        {"date": d, "pnl": round(v, 2)}
        for d, v in sorted(buckets.items())
    ]


def _breaking_news(n: int = 4) -> list[dict]:
    """Cache'den en yüksek etkili haberleri çeker."""
    all_news: list[dict] = cache_get("wt:news:feed") or []
    sorted_news = sorted(
        all_news,
        key=lambda x: (x.get("is_breaking", False), x.get("ai_impact_score", 0)),
        reverse=True,
    )
    return [
        {
            "id":           n_item.get("id"),
            "title":        n_item.get("title"),
            "source":       n_item.get("source"),
            "category":     n_item.get("category"),
            "impact_score": n_item.get("ai_impact_score"),
            "is_breaking":  n_item.get("is_breaking", False),
            "published_at": n_item.get("published_at"),
            "url":          n_item.get("url"),
        }
        for n_item in sorted_news[:n]
    ]


def _ai_bias() -> dict | None:
    """BTC ve ETH için cache'deki günlük bias'ı döner."""
    btc = cache_get("wt:bias:BTCUSDT")
    eth = cache_get("wt:bias:ETHUSDT")
    if not btc and not eth:
        return None
    return {
        "BTCUSDT": btc,
        "ETHUSDT": eth,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def mobile_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mobil dashboard için tek API çağrısıyla tüm veriyi döner:
    - Kullanıcı bilgisi + hedef
    - İstatistikler (win rate, P&L, streak…)
    - Haftalık para akışı (7 günlük P&L grafiği)
    - Son 5 işlem (journal özeti)
    - Açık pozisyonlar
    - Kritik haberler (top 4)
    - AI günlük bias (BTC/ETH)
    """
    trades = (
        db.query(TradeLog)
        .filter(TradeLog.user_id == current_user.id)
        .order_by(TradeLog.date.desc())
        .limit(200)  # Performans: en fazla 200 işlem
        .all()
    )

    goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()

    recent_trades = [
        {
            "id":          t.id,
            "symbol":      t.symbol,
            "trade_type":  t.trade_type,
            "status":      t.status,
            "entry_price": _float(t.entry_price),
            "exit_price":  _float(t.exit_price),
            "pnl":         _float(t.pnl),
            "date":        t.date.isoformat() if t.date else None,
            "title":       t.title,
        }
        for t in trades[:5]
    ]

    open_positions = [
        {
            "id":          t.id,
            "symbol":      t.symbol,
            "trade_type":  t.trade_type,
            "entry_price": _float(t.entry_price),
            "stop_loss":   _float(t.stop_loss),
            "risk_amount": _float(t.risk_amount),
            "date":        t.date.isoformat() if t.date else None,
        }
        for t in trades if t.status == "OPEN"
    ]

    return {
        "user": {
            "id":       current_user.id,
            "name":     current_user.full_name,
            "email":    current_user.email,
            "avatar":   current_user.avatar_url,
            "plan":     current_user.subscription_status,
        },
        "goal": {
            "target":     _float(goal.target_amount) if goal else None,
            "daily_loss": _float(goal.daily_loss_limit) if goal else None,
            "drawdown":   _float(goal.max_drawdown) if goal else None,
            "starting":   _float(goal.starting_balance) if goal else None,
        } if goal else None,
        "stats":         _compute_stats(trades),
        "money_flow":    _money_flow(trades, days=7),
        "recent_trades": recent_trades,
        "open_positions": open_positions,
        "news":          _breaking_news(n=4),
        "ai_bias":       _ai_bias(),
        "generated_at":  datetime.now(timezone.utc).isoformat(),
    }


@router.get("/journal")
def mobile_journal(
    page:  int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None, pattern="^(OPEN|CLOSED)$"),
    symbol: str | None = Query(default=None, max_length=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sayfalanmış işlem günlüğü — mobil journal sekmesi için.
    Filtreler: ?status=CLOSED&symbol=BTCUSDT
    """
    q = db.query(TradeLog).filter(TradeLog.user_id == current_user.id)
    if status:
        q = q.filter(TradeLog.status == status)
    if symbol:
        q = q.filter(TradeLog.symbol == symbol.upper())

    total = q.count()
    trades = (
        q.order_by(TradeLog.date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total":   total,
        "page":    page,
        "limit":   limit,
        "pages":   (total + limit - 1) // limit,
        "trades":  [
            {
                "id":              t.id,
                "symbol":          t.symbol,
                "trade_type":      t.trade_type,
                "status":          t.status,
                "title":           t.title,
                "entry_price":     _float(t.entry_price),
                "exit_price":      _float(t.exit_price),
                "stop_loss":       _float(t.stop_loss),
                "pnl":             _float(t.pnl),
                "risk_percentage": _float(t.risk_percentage),
                "strategy_note":   t.strategy_note,
                "psychology_note": t.psychology_note,
                "ai_feedback":     t.ai_feedback,
                "date":            t.date.isoformat() if t.date else None,
            }
            for t in trades
        ],
    }


@router.get("/stats")
def mobile_stats(
    period: str = Query(default="30d", pattern="^(7d|30d|90d|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Seçilen periyotta detaylı istatistik + para akışı — mobil analiz sekmesi.
    ?period=7d | 30d | 90d | all
    """
    period_map = {"7d": 7, "30d": 30, "90d": 90, "all": 36500}
    days = period_map[period]
    since = datetime.now(timezone.utc) - timedelta(days=days)

    trades = (
        db.query(TradeLog)
        .filter(
            TradeLog.user_id == current_user.id,
            TradeLog.date >= since,
        )
        .order_by(TradeLog.date.asc())
        .all()
    )

    flow_days = min(days, 90)  # grafik için max 90 nokta
    return {
        "period":    period,
        "stats":     _compute_stats(trades),
        "money_flow": _money_flow(trades, days=flow_days),
    }
