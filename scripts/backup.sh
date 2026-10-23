#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde cohérente de la base SQLite + photos téléversées.
# Usage : ./scripts/backup.sh
# Variables : COMPOSE_FILE (docker-compose.yml), BACKUP_DIR (./backups), KEEP_DAYS (30)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="rwaresto-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "→ Sauvegarde SQLite dans le conteneur…"
docker compose -f "$COMPOSE_FILE" exec -T app sh -c "
  set -e
  sqlite3 /data/rwaresto.db \".backup '/tmp/rwaresto-backup.db'\"
  tar -czf '/tmp/$ARCHIVE' -C /tmp rwaresto-backup.db -C /data uploads
  rm -f /tmp/rwaresto-backup.db
"

echo "→ Copie de l'archive vers $BACKUP_DIR…"
docker compose -f "$COMPOSE_FILE" cp "app:/tmp/$ARCHIVE" "$BACKUP_DIR/$ARCHIVE"
docker compose -f "$COMPOSE_FILE" exec -T app rm -f "/tmp/$ARCHIVE"

echo "→ Rotation des archives de plus de $KEEP_DAYS jours…"
find "$BACKUP_DIR" -maxdepth 1 -name 'rwaresto-*.tar.gz' -type f -mtime "+$KEEP_DAYS" -delete

echo "✓ Sauvegarde : $BACKUP_DIR/$ARCHIVE"
