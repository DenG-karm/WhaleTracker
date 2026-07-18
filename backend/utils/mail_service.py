import os
import logging
import resend

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY")

SENDER = "WhaleTracker <noreply@whaletracker.app>"

_OTP_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#161b22;border-radius:12px;border:1px solid #30363d;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a73e8 0%,#0ea5e9 100%);padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                🐋 WhaleTracker
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;">Security Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:15px;color:#8b949e;">Your one-time verification code is:</p>
              <div style="margin:20px 0;text-align:center;">
                <span style="display:inline-block;background:#0d1117;border:2px solid #1a73e8;
                             border-radius:10px;padding:18px 40px;font-size:38px;font-weight:800;
                             letter-spacing:12px;color:#60a5fa;font-family:'Courier New',monospace;">
                  {code}
                </span>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#8b949e;line-height:1.6;">
                This code expires in <strong style="color:#f0f6fc;">10 minutes</strong>.
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #21262d;">
              <p style="margin:0;font-size:11px;color:#484f58;line-height:1.5;">
                © 2026 WhaleTracker. All rights reserved.<br />
                This is an automated security message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

_RETENTION_FOOTER = """
<table width="100%" cellpadding="0" cellspacing="0"
       style="margin-top:32px;border-top:1px solid #30363d;">
  <tr>
    <td style="padding:20px 32px;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">
      <p style="margin:0;font-size:11px;color:#8b949e;line-height:1.7;">
        You are receiving this because you haven't checked your portfolio in 10 days.<br />
        <a href="https://whaletracker.app/unsubscribe?email={email}"
           style="color:#60a5fa;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&bull;&nbsp;
        <a href="https://whaletracker.app" style="color:#60a5fa;text-decoration:none;">
          WhaleTracker
        </a>
      </p>
    </td>
  </tr>
</table>"""

_RETENTION_WRAPPER = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#161b22;border-radius:12px;border:1px solid #30363d;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              {content}
              {footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_otp_email(to_email: str, code: str) -> dict:
    try:
        params = {
            "from": SENDER,
            "to": [to_email],
            "subject": f"{code} — Your WhaleTracker Verification Code",
            "html": _OTP_HTML.format(code=code),
        }
        response = resend.Emails.send(params)
        return {"success": True, "id": response.get("id")}
    except Exception as e:
        logger.error("send_otp_email failed for %s: %s", to_email, e)
        return {"success": False, "error": str(e)}


async def send_market_retention_email(
    to_email: str, subject: str, dynamic_market_html: str
) -> dict:
    try:
        footer = _RETENTION_FOOTER.format(email=to_email)
        full_html = _RETENTION_WRAPPER.format(
            content=dynamic_market_html, footer=footer
        )
        params = {
            "from": SENDER,
            "to": [to_email],
            "subject": subject,
            "html": full_html,
        }
        response = resend.Emails.send(params)
        return {"success": True, "id": response.get("id")}
    except Exception as e:
        logger.error("send_market_retention_email failed for %s: %s", to_email, e)
        return {"success": False, "error": str(e)}
