#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde complète du site :
# - base SQLite + photos via scripts/backup.sh
# - configuration (.env, docker-compose, nginx, révision Git)
# Usage : ./scripts/backup-site.sh
# Variables : BACKUP_DIR, KEEP_DAYS_DATA (10), KEEP_DAYS_CONFIG (90),
#             OFFSITE_DIR, RCLONE_REMOTE

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
CONFIG_DIR="$BACKUP_DIR/config"
KEEP_DAYS_DATA="${KEEP_DAYS_DATA:-10}"
KEEP_DAYS_CONFIG="${KEEP_DAYS_CONFIG:-90}"
STAMP="$(date +%Y%m%d-%H%M%S)"
CONFIG_ARCHIVE="rwaresto-config-$STAMP.tar.gz"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$CONFIG_DIR"

echo "→ Sauvegarde des données…"
BACKUP_DIR="$BACKUP_DIR" KEEP_DAYS="$KEEP_DAYS_DATA" "$ROOT_DIR/scripts/backup.sh"

echo "→ Préparation de la configuration…"
cp "$ROOT_DIR/docker-compose.yml" "$WORK_DIR/docker-compose.yml"
if [ -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env" "$WORK_DIR/.env"
  chmod 600 "$WORK_DIR/.env"
fi
if [ -d "$ROOT_DIR/deploy/nginx" ]; then
  cp -R "$ROOT_DIR/deploy/nginx" "$WORK_DIR/nginx"
fi
{
  echo "revision=$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo inconnue)"
  echo "date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "host=$(hostname)"
} > "$WORK_DIR/REVISION"

echo "→ Création de l'archive de configuration…"
tar -czf "$CONFIG_DIR/$CONFIG_ARCHIVE" -C "$WORK_DIR" .
chmod 600 "$CONFIG_DIR/$CONFIG_ARCHIVE"
tar -tzf "$CONFIG_DIR/$CONFIG_ARCHIVE" >/dev/null

latest_data="$(find "$BACKUP_DIR" -maxdepth 1 -name 'rwaresto-*.tar.gz' -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"

if [ -n "${OFFSITE_DIR:-}" ]; then
  echo "→ Copie hors site vers $OFFSITE_DIR…"
  mkdir -p "$OFFSITE_DIR"
  cp "$CONFIG_DIR/$CONFIG_ARCHIVE" "$OFFSITE_DIR/"
  if [ -n "$latest_data" ]; then
    cp "$latest_data" "$OFFSITE_DIR/"
  fi
fi

if [ -n "${RCLONE_REMOTE:-}" ]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "ERREUR : rclone est configuré mais introuvable." >&2
    exit 1
  fi
  REMOTE="${RCLONE_REMOTE%/}"
  echo "→ Envoi vers Google Drive ($REMOTE)…"
  rclone mkdir "$REMOTE/data" >/dev/null
  rclone mkdir "$REMOTE/config" >/dev/null
  if [ -n "$latest_data" ]; then
    rclone copy "$latest_data" "$REMOTE/data/" --stats-one-line --stats=30s
  fi
  rclone copy "$CONFIG_DIR/$CONFIG_ARCHIVE" "$REMOTE/config/" --stats-one-line --stats=30s
  rclone delete "$REMOTE/data" --min-age "${KEEP_DAYS_DATA}d" --include 'rwaresto-*.tar.gz' >/dev/null 2>&1 || true
  rclone delete "$REMOTE/config" --min-age "${KEEP_DAYS_CONFIG}d" --include 'rwaresto-config-*.tar.gz' >/dev/null 2>&1 || true
fi

echo "→ Rotation des configurations de plus de $KEEP_DAYS_CONFIG jours…"
find "$CONFIG_DIR" -maxdepth 1 -name 'rwaresto-config-*.tar.gz' -type f -mtime "+$KEEP_DAYS_CONFIG" -delete

echo "✓ Sauvegarde complète : $CONFIG_DIR/$CONFIG_ARCHIVE"
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "  Copie distante : ${RCLONE_REMOTE%/}/data et ${RCLONE_REMOTE%/}/config"
fi
echo "  Les archives contiennent des secrets (.env) : conservez-les en sécurité."
