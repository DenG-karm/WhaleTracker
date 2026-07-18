# 1. Resmi ve hafif bir Python sürümü seçiyoruz
FROM python:3.11-slim

# 2. Konteyner içindeki çalışma dizinini belirliyoruz
WORKDIR /app

# 3. Önce sadece requirements.txt'yi kopyalayıp kütüphaneleri kuruyoruz (Önbellek avantajı için)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Geri kalan tüm Python dosyalarını içeri kopyalıyoruz
COPY . .

# 5. Yüklenen resimlerin (Trade SS'lerinin) kaybolmaması için bir klasör belirtiyoruz
RUN mkdir -p uploads

# 6. Dışarıya açılacak port — Railway PORT env var ile eşleşmeli (8080)
EXPOSE 8080

# 7. FastAPI sunucusunu başlatan komut (migration önce çalışır, hata olsa da uvicorn başlar)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]