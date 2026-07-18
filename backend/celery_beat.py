from celery.schedules import crontab
from celery_app import celery_app

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Her 5-15 saniyede bir sahte (mock) balina transferi gönder.
    # Celery beat schedule saniye bazında desteksizdir (dakika bazındadır).
    # Daha hızlı veri aksın isterseniz arkaplanda asenkron bir dinleyici
    # çalışabilir. Biz burada gösteri amaçlı her 10 saniyede çalıştıran
    # basit bir Celery taskı planlıyoruz (Eğer dakika isterseniz crontab('*') kullanın)
    sender.add_periodic_task(10.0, celery_app.signature('tasks.whale_pipeline.generate_and_broadcast'), name='Broadcast Mock Whale Transfers')
