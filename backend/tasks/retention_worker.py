import asyncio
import logging
import os
import sys

# Allow imports from backend root when run as a standalone script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from sqlalchemy import func

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import SessionLocal
from models import User, TrustedDevice
from utils.mail_service import send_market_retention_email

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [retention_worker] %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── FOMO market HTML ──────────────────────────────────────────────────────────
_MARKET_HTML = """
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:0 0 18px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#f59e0b;letter-spacing:1px;
                text-transform:uppercase;">🚨 Live Market Intelligence</p>
      <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;color:#f0f6fc;line-height:1.3;">
        Massive Whale Activity Detected
      </h1>
      <p style="margin:8px 0 0;font-size:14px;color:#8b949e;">
        Significant on-chain and derivatives movements in the last 24 hours.
      </p>
    </td>
  </tr>

  <!-- Alert row -->
  <tr>
    <td style="padding:0 0 12px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#1c2128;border:1px solid #30363d;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#f87171;font-weight:700;">
              ● XAUUSD &nbsp;|&nbsp; <span style="color:#f0f6fc;">+4.8% spike</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#8b949e;">
              $2.4B notional moved by a single entity in the futures market.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:0 0 12px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#1c2128;border:1px solid #30363d;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#34d399;font-weight:700;">
              ● BTC / ETH &nbsp;|&nbsp; <span style="color:#f0f6fc;">Accumulation Phase</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#8b949e;">
              42,000 BTC transferred off exchanges in the last 6 hours — historically
              a precursor to a major price move.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:0 0 12px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#1c2128;border:1px solid #30363d;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#f59e0b;font-weight:700;">
              ● SPX &amp; NDX &nbsp;|&nbsp; <span style="color:#f0f6fc;">Volatility Surge</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#8b949e;">
              VIX jumped 18% intraday. Options flow shows heavy put buying across
              mega-cap tech — your open positions may be exposed.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:24px 0 0;text-align:center;">
      <a href="https://whaletracker.app"
         style="display:inline-block;background:linear-gradient(135deg,#1a73e8,#0ea5e9);
                color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;
                border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
        Check My Portfolio →
      </a>
    </td>
  </tr>
</table>
"""

_SUBJECT = "Market Alert: Heavy Whale Activity Detected 🐋"

# ── Core worker ───────────────────────────────────────────────────────────────

async def run_retention_campaign() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=11)
        window_end   = now - timedelta(days=10)

        # Users whose most recent trusted device login falls in the [10d, 11d) window
        inactive_user_ids = (
            db.query(TrustedDevice.user_id)
            .filter(
                TrustedDevice.last_used_at >= window_start,
                TrustedDevice.last_used_at < window_end,
            )
            .group_by(TrustedDevice.user_id)
            .having(func.max(TrustedDevice.last_used_at) < window_end)
            .subquery()
        )

        users = (
            db.query(User)
            .filter(User.id.in_(inactive_user_ids))
            .all()
        )

        logger.info("Retention campaign: %d inactive users found.", len(users))

        for user in users:
            try:
                result = await send_market_retention_email(
                    to_email=user.email,
                    subject=_SUBJECT,
                    dynamic_market_html=_MARKET_HTML,
                )
                if result.get("success"):
                    logger.info("Sent retention email — user_id=%s email=%s", user.id, user.email)
                else:
                    logger.warning(
                        "Failed to send retention email — user_id=%s error=%s",
                        user.id,
                        result.get("error"),
                    )
            except Exception as exc:
                logger.error(
                    "Unexpected error for user_id=%s: %s", user.id, exc, exc_info=True
                )

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_retention_campaign())
