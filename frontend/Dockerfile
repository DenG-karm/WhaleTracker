# --- GELİŞTİRME AŞAMASI ---
# Node.js ortamını kuruyoruz.
FROM node:18-alpine
WORKDIR /app

# Önce paket listelerini kopyalayıp kuruyoruz (Hız için)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Geliştirme ortamında, kod değişiklikleri docker-compose.yml'deki volume mount ile sağlanır.
# Bu nedenle, tüm kaynak kodunu kopyalamaya veya "npm run build" çalıştırmaya gerek yoktur.