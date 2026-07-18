#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/backup_db.sh — WhaleTracker PostgreSQL Yedekleme
#
# Kullanım (manuel):
#   bash scripts/backup_db.sh
#
# Cron örneği (günlük 03:00'da):
#   0 3 * * * /app/scripts/backup_db.sh >> /var/log/wt_backup.log 2>&1
#
# Gereksinimler:
#   - POSTGRES_* ortam değişkenleri tanımlı olmalı (ya da aşağıda doldur)
#   - pg_dump container içinde çalışıyorsa Docker exec ile ara
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/whaletracker}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DB_NAME="${POSTGRES_DB:-whaletracker}"
DB_USER="${POSTGRES_USER:-whale}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

FILENAME="${BACKUP_DIR}/wt_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Yedekleme dizini yoksa oluştur
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Yedekleme başlıyor: ${FILENAME}"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-privileges \
    "${DB_NAME}" | gzip > "${FILENAME}"

echo "[$(date)] Yedekleme tamamlandı: $(du -sh "${FILENAME}" | cut -f1)"

# Eski yedekleri temizle
find "${BACKUP_DIR}" -name "wt_${DB_NAME}_*.sql.gz" \
    -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler silindi."
