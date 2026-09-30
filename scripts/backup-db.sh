#!/usr/bin/env sh
# Dumps the Dcash Postgres database, gzips it, and prunes backups older
# than BACKUP_RETENTION_DAYS. No automated backup existed before this (see
# audit) — a server failure meant unrecoverable user financial data.
#
# Reads standard PG* env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
# so it works both as the loop in docker-compose.prod.yml's dcash-backup
# service and as a manual cron entry on a bare host.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/dcash-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup-db] Starting dump -> $FILE"
pg_dump --no-owner --no-privileges | gzip > "$FILE"
echo "[backup-db] Dump complete: $(du -h "$FILE" | cut -f1)"

echo "[backup-db] Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'dcash-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup-db] Done."
