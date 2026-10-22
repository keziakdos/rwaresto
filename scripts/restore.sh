#!/usr/bin/env bash
set -euo pipefail

# Restauration d'une sauvegarde produite par scripts/backup.sh.
# Usage : ./scripts/restore.sh backups/rwaresto-20260101-120000.tar.gz
# ATTENTION : arrête l'application et remplace la base + les photos actuelles.

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage : $0 chemin/vers/rwaresto-AAAAMMJJ-HHMMSS.tar.gz" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
ARCHIVE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"

read -r -p "Cette opération remplace les données actuelles. Continuer ? [oui/N] " answer
[ "$answer" = "oui" ] || { echo "Annulé."; exit 0; }

echo "→ Arrêt de l'application…"
docker compose -f "$COMPOSE_FILE" stop app

echo "→ Copie de l'archive dans le conteneur…"
docker compose -f "$COMPOSE_FILE" cp "$ARCHIVE" "app:/tmp/rwaresto-restore.tar.gz"

echo "→ Restauration de la base et des photos…"
docker compose -f "$COMPOSE_FILE" run --rm --no-deps --entrypoint sh app -c "
  set -e
  mkdir -p /data
  rm -f /data/rwaresto.db /data/rwaresto.db-journal /data/rwaresto.db-wal /data/rwaresto.db-shm
  rm -rf /data/uploads
  tar -xzf /tmp/rwaresto-restore.tar.gz -C /data --strip-components=0
  mv /data/rwaresto-backup.db /data/rwaresto.db
  rm -f /tmp/rwaresto-restore.tar.gz
"

echo "→ Redémarrage…"
docker compose -f "$COMPOSE_FILE" start app
echo "✓ Restauration terminée. Vérifiez les journaux : docker compose logs -f app"
