"""
daily_bias.py
─────────────
generate_daily_bias(symbol, asian_session_data, macro_events)

SMC/ICT konseptlerine dayalı, asenkron Gemini tabanlı AI Karar Motoru.
Kesin, olasılıksız, kurumsal ton.
"""

from __future__ import annotations

import json
import os
import logging
from typing import Any

import google.genai as genai
from google.genai import types

logger = logging.getLogger(__name__)

# ── Yapılandırma ─────────────────────────────────────────────────────────────
_MODEL_NAME = "gemini-2.5-flash"

_SYSTEM_PROMPT = """\
Sen, SMC (Smart Money Concepts) ve ICT (Inner Circle Trader) metodolojisine \
tam hâkim, küresel bir hedge fonunun Baş Risk Yöneticisisin. \
Her sabah masa başına geçer ve o günün tek doğru piyasa yönünü belirlersin. \
Yanıtların piyasa katılımcılarının milyarlarca dolarlık kararlarını etkiler; \
bu yüzden hiçbir belirsizliğe yer yoktur.

KURALLAR — İSTİSNASIZ UYGULANACAKTIR:
1. OLASILIKLARLA KONUŞMAK KESINLIKLE YASAKTIR.
   "Düşebilir", "yükselme ihtimali var", "belki", "muhtemelen" gibi ifadeler \
   kullanılamaz. Her karar LONG, SHORT veya NEUTRAL olarak verilir.

2. Analizini tam olarak üç somut kanıta dayandır:
   a) Asian session likidite dinamiği: sweep mi, range konsolidasyonu mu, yoksa \
      breakout sinyali mi? Hangi taraf sweep edildi? Neden önemli?
   b) Makro takvim baskısı: Yüksek etkili haber var mı? Öncesinde mi, sonrasında \
      mı pozisyon alınmalı? İlgisizse açıkça yaz.
   c) HTF (H4/Daily) yapısal durum: BOS veya CHOCH var mı? Son swing high/low \
      bozulmuş mu? Kurumsal order flow hangi yönde?

3. confidence_score hesaplama mantığı:
   • 85-100: Üç kanıt da aynı yönü gösteriyor, yüksek etkili haber yok.
   • 65-84: İki kanıt hizalı, bir tanesi nötr veya zayıf çelişki var.
   • 40-64: Karışık sinyaller; NEUTRAL bias beklenir.
   • 1-39: Sadece NEUTRAL; piyasa belirsizliği çok yüksek.

4. "ai_briefing" alanı KESİNLİKLE 3 cümle olacak:
   • 1. cümle: Asian session kanalından türetilen likidite tezi.
   • 2. cümle: Makro takvim etkisi veya yokluğunun piyasaya yansıması.
   • 3. cümle: HTF yapısal karar ve günün operasyonel vizyonu.
   Her cümle otoriter, birinci şahıs ve sofistike akademik Türkçeyle yazılacak.

5. Yalnızca aşağıdaki JSON şemasında yanıt ver. Şema dışında HİÇBİR karakter \
   yazma — markdown bloğu, açıklama veya boşluk dahil.

JSON ŞEMASI:
{
  "symbol": "<string>",
  "bias": "LONG" | "SHORT" | "NEUTRAL",
  "confidence_score": <integer 1-100>,
  "ai_briefing": "<string — tam olarak 3 cümle, Türkçe>"
}
"""

_GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.2,           # düşük yaratıcılık → deterministik karar
    top_p=0.85,
    max_output_tokens=512,
    response_mime_type="application/json",
    system_instruction=_SYSTEM_PROMPT,
)

_FALLBACK: dict[str, Any] = {
    "symbol":           "UNKNOWN",
    "bias":             "NEUTRAL",
    "confidence_score": 0,
    "ai_briefing": (
        "Piyasa verisi alınamadı; model yanıt vermedi. "
        "Bugün pozisyon açılmayacak, tüm açık emirler iptal edilecek. "
        "Risk yönetimi aktif — sermaye korunması önceliklidir."
    ),
}


# ── Ana fonksiyon ────────────────────────────────────────────────────────────

async def generate_daily_bias(
    symbol: str,
    asian_session_data: dict[str, Any],
    macro_events: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Günlük piyasa yön kararı (Daily Bias) üretir.

    Parameters
    ----------
    symbol : str
        Analiz edilecek sembol.  Ör: "XAUUSD", "BTCUSDT", "EURUSD"
    asian_session_data : dict
        Asya seans verisi.  Beklenen anahtarlar (zorunlu değil):
          high, low, close, volume, swept_high, swept_low, range_pct
    macro_events : list[dict]
        O güne ait makro takvim eventleri.  Beklenen anahtarlar:
          time, currency, event, impact ("low"|"medium"|"high"), forecast, previous

    Returns
    -------
    dict  — Her zaman dört anahtar içerir:
        symbol, bias, confidence_score, ai_briefing
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("[DailyBias] GEMINI_API_KEY bulunamadı — fallback döndürülüyor.")
        return {**_FALLBACK, "symbol": symbol}

    client = genai.Client(api_key=api_key)

    user_prompt = (
        f"SEMBOL: {symbol}\n\n"
        f"ASYA SEANS VERİSİ:\n{json.dumps(asian_session_data, ensure_ascii=False, indent=2)}\n\n"
        f"MAKRO TAKVİM ({len(macro_events)} event):\n"
        f"{json.dumps(macro_events, ensure_ascii=False, indent=2)}\n\n"
        "Yukarıdaki verileri analiz et ve kurallara göre kararını JSON olarak ver."
    )

    try:
        response = await client.aio.models.generate_content(
            model=_MODEL_NAME,
            contents=user_prompt,
            config=_GENERATION_CONFIG,
        )
        raw_text = response.text.strip()

        # response_mime_type="application/json" olmasına rağmen
        # bazen markdown bloğu gelebilir — temizle
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed: dict[str, Any] = json.loads(raw_text)

        # Şema doğrulama
        bias = str(parsed.get("bias", "NEUTRAL")).upper()
        if bias not in {"LONG", "SHORT", "NEUTRAL"}:
            bias = "NEUTRAL"

        return {
            "symbol":           str(parsed.get("symbol", symbol)),
            "bias":             bias,
            "confidence_score": max(1, min(100, int(parsed.get("confidence_score", 50)))),
            "ai_briefing":      str(parsed.get("ai_briefing", _FALLBACK["ai_briefing"])),
        }

    except json.JSONDecodeError as exc:
        logger.warning("[DailyBias] JSON parse hatası (%s) — fallback döndürülüyor.", exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[DailyBias] Beklenmeyen hata: %s", exc, exc_info=True)

    return {**_FALLBACK, "symbol": symbol}
