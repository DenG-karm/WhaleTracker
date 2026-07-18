"""
Psikoloji Analitikleri – asyncpg tabanlı yüksek performanslı endpoint.

GET /analytics/psych-report
    Son 30 günlük kapalı işlemleri ai_logs tablosuyla JOIN'ler,
    JSONB metadata'dan is_revenge_trade ve psychology_score'u çeker ve
    aşağıdaki iki metriği tek sorguda hesaplar:

    1. total_revenge_loss   – intikam işlemlerindeki (is_revenge_trade=true) toplam zarar
    2. high_psych_win_rate  – psychology_score > 7  olan işlemlerin kazanma oranı (0-1)
    3. low_psych_win_rate   – psychology_score < 4  olan işlemlerin kazanma oranı (0-1)
    4. high_psych_total     – puan > 7 işlem sayısı
    5. low_psych_total      – puan < 4 işlem sayısı
"""

from __future__ import annotations

import os
import re
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Path
from auth import get_current_user
from models import User

router = APIRouter()

# ── Bağlantı havuzu (lazy singleton) ─────────────────────────────────────────
_pool: asyncpg.Pool | None = None

_ASYNCPG_DSN_RE = re.compile(r"^postgresql(\+\w+)?://")


def _to_asyncpg_dsn(url: str) -> str:
    """SQLAlchemy driver suffix'ini temizler: postgresql+asyncpg:// → postgresql://"""
    return _ASYNCPG_DSN_RE.sub("postgresql://", url)


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None or _pool._closed:
        dsn = _to_asyncpg_dsn(
            os.getenv(
                "DATABASE_URL",
                "postgresql://whale:whale_secret_2024@postgres:5432/whaletracker",
            )
        )
        _pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10, command_timeout=30)
    return _pool


# ── Ana sorgu (tek geçiş, CTE + FILTER aggregate) ─────────────────────────────
_PSYCH_REPORT_SQL = """
WITH base AS (
    SELECT
        t.pnl,
        (al.metadata ->> 'is_revenge_trade')::boolean          AS is_revenge,
        (al.metadata ->> 'psychology_score')::numeric           AS psych_score
    FROM   trades   t
    JOIN   ai_logs  al ON al.trade_id = t.id
    WHERE  t.user_id = $1
      AND  t.status  = 'CLOSED'
      AND  t.date   >= NOW() - INTERVAL '30 days'
),
revenge AS (
    SELECT
        COALESCE(
            SUM(pnl) FILTER (WHERE is_revenge = true AND pnl < 0),
            0
        )::numeric(15,2) AS total_loss
    FROM base
),
psych AS (
    SELECT
        -- Yüksek puan (>7) kazanma oranı
        COUNT(*) FILTER (WHERE psych_score > 7 AND pnl > 0)::numeric
            / NULLIF(COUNT(*) FILTER (WHERE psych_score > 7), 0)  AS high_wr,

        -- Düşük puan (<4) kazanma oranı
        COUNT(*) FILTER (WHERE psych_score < 4 AND pnl > 0)::numeric
            / NULLIF(COUNT(*) FILTER (WHERE psych_score < 4), 0)  AS low_wr,

        COUNT(*) FILTER (WHERE psych_score > 7) AS high_total,
        COUNT(*) FILTER (WHERE psych_score < 4) AS low_total
    FROM base
)
SELECT
    r.total_loss,
    p.high_wr,
    p.low_wr,
    p.high_total,
    p.low_total
FROM revenge r, psych p;
"""


@router.get("/analytics/psych-report")
async def get_psych_report(current_user: User = Depends(get_current_user)):
    """
    Son 30 günün intikam işlem kayıplarını ve psikoloji skoru segmentlerine
    göre kazanma oranlarını döner.

    Yanıt şeması:
    {
        "total_revenge_loss":  float,     # negatif değer (zarar miktarı)
        "high_psych_win_rate": float|null, # 0-1 arası oran; yeterli veri yoksa null
        "low_psych_win_rate":  float|null,
        "high_psych_total":    int,
        "low_psych_total":     int
    }
    """
    try:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_PSYCH_REPORT_SQL, current_user.id)
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"DB sorgu hatası: {exc}") from exc

    if row is None:
        return {
            "total_revenge_loss":  0.0,
            "high_psych_win_rate": None,
            "low_psych_win_rate":  None,
            "high_psych_total":    0,
            "low_psych_total":     0,
        }

    def _pct(val) -> float | None:
        return round(float(val), 4) if val is not None else None

    return {
        "total_revenge_loss":  float(row["total_loss"]),
        "high_psych_win_rate": _pct(row["high_wr"]),
        "low_psych_win_rate":  _pct(row["low_wr"]),
        "high_psych_total":    int(row["high_total"]),
        "low_psych_total":     int(row["low_total"]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/dashboard-stats/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

_DASHBOARD_STATS_SQL = """
WITH base AS (
    SELECT
        t.pnl,
        (al.metadata ->> 'is_revenge_trade')::boolean  AS is_revenge,
        (al.metadata ->> 'psychology_score')::numeric  AS psych_score
    FROM   trades   t
    JOIN   ai_logs  al ON al.trade_id = t.id
    WHERE  t.user_id = $1
      AND  t.status  = 'CLOSED'
      AND  t.date   >= NOW() - INTERVAL '30 days'
),
revenge AS (
    SELECT
        COALESCE(
            SUM(pnl) FILTER (WHERE is_revenge = true AND pnl < 0),
            0
        )::numeric(15,2) AS total_loss
    FROM base
),
win_rates AS (
    SELECT
        -- psychology_score >= 7
        ROUND(
            COUNT(*) FILTER (WHERE psych_score >= 7 AND pnl > 0)::numeric * 100
            / NULLIF(COUNT(*) FILTER (WHERE psych_score >= 7), 0),
            1
        ) AS high_wr_pct,
        -- psychology_score < 5
        ROUND(
            COUNT(*) FILTER (WHERE psych_score < 5 AND pnl > 0)::numeric * 100
            / NULLIF(COUNT(*) FILTER (WHERE psych_score < 5), 0),
            1
        ) AS low_wr_pct
    FROM base
),
latest AS (
    SELECT metadata ->> 'harsh_feedback' AS feedback
    FROM   ai_logs
    WHERE  user_id = $1
      AND  metadata ? 'harsh_feedback'
    ORDER  BY created_at DESC
    LIMIT  1
)
SELECT
    r.total_loss,
    w.high_wr_pct,
    w.low_wr_pct,
    l.feedback
FROM revenge r, win_rates w
LEFT JOIN latest l ON true;
"""


@router.get("/api/v1/dashboard-stats/{user_id}")
async def get_dashboard_stats(
    user_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
):
    """
    Frontend Dashboard of Truth için psikoloji istatistikleri.

    Yetki: kullanıcı yalnızca kendi verisini çekebilir.

    Yanıt:
    {
        "revenge_loss":      float,      # ≤ 0 (zarar toplamı)
        "high_psy_win_rate": float|null, # 0-100 arası yüzde
        "low_psy_win_rate":  float|null,
        "latest_feedback":   str|null
    }
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcının verisine erişim yasak.")

    try:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_DASHBOARD_STATS_SQL, user_id)
    except asyncpg.PostgresError as exc:
        raise HTTPException(status_code=500, detail=f"DB sorgu hatası: {exc}") from exc

    if row is None:
        return {
            "revenge_loss":      0.0,
            "high_psy_win_rate": None,
            "low_psy_win_rate":  None,
            "latest_feedback":   None,
        }

    return {
        "revenge_loss":      float(row["total_loss"]),
        "high_psy_win_rate": float(row["high_wr_pct"]) if row["high_wr_pct"] is not None else None,
        "low_psy_win_rate":  float(row["low_wr_pct"])  if row["low_wr_pct"]  is not None else None,
        "latest_feedback":   row["feedback"],
    }
