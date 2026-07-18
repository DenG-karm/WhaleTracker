"""
celery_app.py — WhaleTracker Celery Konfigürasyonu
===================================================
Broker  : Redis (liste tabanlı kuyruk)
Backend : Redis (görev sonuçlarını saklar)
Kuyruklar:
  - default       : Genel görevler
  - whale_alerts  : Balina analiz görevleri (yüksek öncelik)
  - ai_tasks      : Gemini AI çağrıları (ağır, izole edilmiş)
"""

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "whaletracker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.wallet_analysis",
        "tasks.ai_analysis",
        "tasks.whale_pipeline",
    ],
)

celery_app.conf.update(
    # Serileştirme
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Zaman dilimleri
    timezone="UTC",
    enable_utc=True,

    # Sonuç saklama süresi (12 saat)
    result_expires=60 * 60 * 12,

    # Kuyruk yönlendirmesi
    task_routes={
        "tasks.whale_pipeline.*": {"queue": "whale_alerts"},
        "tasks.ai_analysis.*":    {"queue": "ai_tasks"},
        "tasks.wallet_analysis.*":{"queue": "whale_alerts"},
    },

    # Worker ayarları
    worker_prefetch_multiplier=1,   # Adaletli dağılım (ağır görevler için önemli)
    task_acks_late=True,            # Görev tamamlanınca onayla (crash güvenliği)

    # Yeniden deneme
    task_max_retries=3,
    task_default_retry_delay=30,    # 30 saniye bekle, sonra tekrar dene
)

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Her 30 saniyede bir Etherscan'den büyük transferleri çek ve yayınla
    # (Etherscan ücretsiz tier: 5 req/s, 100k/gün — 30s aralık güvenli)
    sender.add_periodic_task(30.0, celery_app.signature('tasks.whale_pipeline.generate_and_broadcast'), name='Fetch & Broadcast Real Whale Transfers')

if __name__ == "__main__":
    celery_app.start()
