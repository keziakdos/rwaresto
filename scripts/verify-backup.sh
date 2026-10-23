#!/usr/bin/env bash
set -euo pipefail

# Vérifie une archive de sauvegarde sans toucher à la production.
# Usage : ./scripts/verify-backup.sh [archive.tar.gz]
# Sans argument : prend la sauvegarde locale la plus récente.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
ARCHIVE="${1:-}"

if [ -z "$ARCHIVE" ]; then
  ARCHIVE="$(find "$BACKUP_DIR" -maxdepth 1 -name 'rwaresto-*.tar.gz' -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"
fi

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "ERREUR : archive introuvable." >&2
  exit 1
fi

if tar -tzf "$ARCHIVE" | grep -q '^uploads/'; then
  echo "ERREUR : cette archive contient encore des images (ancienne sauvegarde)." >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
tar -xzf "$ARCHIVE" -C "$WORK_DIR"

if [ ! -f "$WORK_DIR/rwaresto-backup.db" ]; then
  echo "ERREUR : base SQLite absente de l'archive." >&2
  exit 1
fi

python3 - "$WORK_DIR/rwaresto-backup.db" <<'PY'
import sqlite3
import sys

db = sqlite3.connect(sys.argv[1])
integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
print(f"Intégrité SQLite : {integrity}")
if integrity != "ok":
    sys.exit(1)
for table in ("Product", "Category", "User", "Setting"):
    print(f"{table:10s} : {db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]}")
try:
    print(f"{'Order':10s} : {db.execute('SELECT COUNT(*) FROM \"Order\"').fetchone()[0]}")
except sqlite3.Error:
    print("Order      : table absente")
db.close()
PY

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "✓ Archive valide : $ARCHIVE ($SIZE, sans images)"
