"""
tasks/ai_analysis.py — Gemini AI Trade Analizi (Async Celery Task)
===================================================================
Trade analizi gibi ağır AI çağrıları API'yi kilitlemez.
Model: gemini-2.5-flash (gemini-1.5-flash'tan yükseltildi)
"""

from celery_app import celery_app
from cache import cache_set, cache_get


@celery_app.task(
    name="tasks.ai_analysis.analyze_trade_async",
    queue="ai_tasks",
    bind=True,
    max_retries=2,
    soft_time_limit=60,
)
def analyze_trade_async(self, trade_data: dict, user_id: int) -> dict:
    """
    Bir trade'i Gemini 2.5 Flash ile derinlemesine analiz eder.
    Sonuç Redis'e yazılır, frontend task_id polling ile alır.
    """
    import os
    import google.genai as genai

    cache_key = f"wt:ai:trade:{trade_data.get('id', 'unknown')}"

    cached = cache_get(cache_key)
    if cached:
        return {"status": "cached", "feedback": cached}

    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        pnl_val = float(trade_data.get("pnl") or 0)
        result_label = "KÂR" if pnl_val > 0 else "ZARAR"
        rr_entry = float(trade_data.get("entry_price") or 0)
        rr_stop = float(trade_data.get("stop_loss") or 0)
        stop_distance = abs(rr_entry - rr_stop) if rr_entry and rr_stop else None
        rr_text = f"{stop_distance:.4f} puan ({abs(stop_distance/rr_entry*100):.2f}%)" if stop_distance else "Bilinmiyor"

        prompt = f"""Sen ICT/SMC uzmanı, kurumsal bir trade koçusun. Aşağıdaki kapalı trade'i derinlemesine analiz et.

TRADE KAYDI:
• Sembol: {trade_data.get('symbol')}
• Yön: {trade_data.get('trade_type', 'LONG')}
• Giriş: ${rr_entry}  |  Stop Loss: ${rr_stop}
• Stop Mesafesi: {rr_text}
• Risk: ${trade_data.get('risk_amount')} USD (%{trade_data.get('risk_percentage', '?')})
• Sonuç: {result_label} ${pnl_val:+.2f}
• Strateji Notu: {trade_data.get('strategy_note') or 'Belirtilmemiş'}
• Psikoloji Notu: {trade_data.get('psychology_note') or 'Belirtilmemiş'}
• Risk Notu: {trade_data.get('risk_note') or 'Belirtilmemiş'}

ZORUNLU ANALİZ FORMATI:
1. **Risk/Ödül Kalitesi:** Stop mesafesi, giriş mantığı ve R/R oranı değerlendirmesi.
2. **Strateji Tutarlılığı:** Nota göre strateji ile sonuç örtüşüyor mu?
3. **Psikoloji Tespiti:** Notta duygusal işaret var mı? (FOMO, intikam, aşırı güven)
4. **Kritik Hata / Güç:** Bu işlemin en büyük hatası veya en iyi yönü neydi?
5. **Sonraki İşlem İçin Kural:** Bu trade'den çıkarılacak tek somut kural.

Maksimum 180 kelime. Kısa, somut, otoriter yaz. Türkçe yanıt ver."""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        feedback = response.text

        # 6 saatliğine cache'le
        cache_set(cache_key, feedback, ttl_seconds=21600)

        return {"status": "completed", "feedback": feedback}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=15)
