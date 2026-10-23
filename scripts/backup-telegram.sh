#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde Telegram tous les 10 jours.
# - archive SQLite uniquement, sans images
# - refus si l'archive dépasse 30 Mo
# - envoi vérifié via l'API Telegram
# Usage : ./scripts/backup-telegram.sh
# Test forcé : FORCE_TELEGRAM_BACKUP=1 ./scripts/backup-telegram.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$ROOT_DIR/.backup.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.backup.env"
  set +a
fi
if [ -f "$ROOT_DIR/.monitor.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.monitor.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
KEEP_DAYS_DATA="${KEEP_DAYS_DATA:-10}"
INTERVAL_DAYS="${INTERVAL_DAYS:-10}"
MAX_BYTES="${MAX_BYTES:-31457280}"
FORCE="${FORCE_TELEGRAM_BACKUP:-0}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
SUCCESS_STATE="$BACKUP_DIR/.telegram-last-success"
OVERSIZE_STATE="$BACKUP_DIR/.telegram-last-oversize"
TMP_FILES=()
trap 'rm -f "${TMP_FILES[@]}"' EXIT

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

cleanup_tmp() {
  rm -f "${TMP_FILES[@]}"
  TMP_FILES=()
}

verify_telegram_response() {
  local response_file="$1"
  local http_code="$2"
  python3 - "$response_file" "$http_code" <<'PY'
import json
import sys

path, http_code = sys.argv[1], sys.argv[2]
try:
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
except Exception:
    print(f"Réponse Telegram illisible (HTTP {http_code}).")
    sys.exit(1)

if not data.get("ok"):
    description = data.get("description") or "erreur inconnue"
    print(f"Telegram a refusé la requête : {description} (HTTP {http_code}).")
    sys.exit(1)

result = data.get("result") or {}
if not result.get("document") and not result.get("message_id"):
    print("Telegram n'a pas confirmé la réception.")
    sys.exit(1)
PY
}

send_text() {
  local message="$1"
  local cfg response http_code rc
  cfg="$(mktemp)"; response="$(mktemp)"
  TMP_FILES+=("$cfg" "$response")
  chmod 600 "$cfg" "$response"
  {
    printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$TELEGRAM_BOT_TOKEN"
    printf 'silent\nshow-error\n'
  } > "$cfg"
  http_code="$(curl --config "$cfg" --max-time 30 -o "$response" -w '%{http_code}' \
    --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
    --data-urlencode "text=$message" || true)"
  set +e
  verify_telegram_response "$response" "$http_code"
  rc=$?
  set -e
  cleanup_tmp
  return $rc
}

send_document() {
  local archive="$1"
  local caption="$2"
  local cfg response http_code rc
  cfg="$(mktemp)"; response="$(mktemp)"
  TMP_FILES+=("$cfg" "$response")
  chmod 600 "$cfg" "$response"
  {
    printf 'url = "https://api.telegram.org/bot%s/sendDocument"\n' "$TELEGRAM_BOT_TOKEN"
    printf 'silent\nshow-error\n'
  } > "$cfg"
  http_code="$(curl --config "$cfg" --max-time 120 -o "$response" -w '%{http_code}' \
    -F "chat_id=$TELEGRAM_CHAT_ID" \
    -F "document=@$archive" \
    --form-string "caption=$caption" || true)"
  set +e
  verify_telegram_response "$response" "$http_code"
  rc=$?
  set -e
  cleanup_tmp
  return $rc
}

within_interval() {
  local state_file="$1"
  [ -f "$state_file" ] && [ -n "$(find "$state_file" -mmin "-$((INTERVAL_DAYS * 1440))" -print -quit 2>/dev/null)" ]
}

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  log "ERREUR : TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID absent dans .monitor.env."
  exit 1
fi

if [ "$FORCE" != "1" ]; then
  if within_interval "$SUCCESS_STATE"; then
    log "Sauvegarde Telegram déjà envoyée il y a moins de $INTERVAL_DAYS jours. Rien à faire."
    exit 0
  fi
  if within_interval "$OVERSIZE_STATE"; then
    log "La dernière archive dépassait 30 Mo. Envoi bloqué jusqu'au prochain contrôle dans $INTERVAL_DAYS jours."
    exit 2
  fi
fi

log "Création de la sauvegarde SQLite sans images…"
if ! BACKUP_DIR="$BACKUP_DIR" KEEP_DAYS="$KEEP_DAYS_DATA" "$ROOT_DIR/scripts/backup.sh"; then
  log "ERREUR : la sauvegarde locale a échoué."
  send_text "Erreur Rwaresto : la sauvegarde locale a échoué. Consultez les logs du serveur." || true
  exit 1
fi

ARCHIVE="$(find "$BACKUP_DIR" -maxdepth 1 -name 'rwaresto-*.tar.gz' -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  log "ERREUR : archive de sauvegarde introuvable."
  exit 1
fi
chmod 600 "$ARCHIVE"

if tar -tzf "$ARCHIVE" | grep -q '^uploads/'; then
  log "ERREUR : l'archive contient des images. Envoi bloqué."
  exit 1
fi

SIZE_BYTES="$(wc -c < "$ARCHIVE")"
SIZE_MB="$(awk -v bytes="$SIZE_BYTES" 'BEGIN { printf "%.2f", bytes / 1048576 }')"
STAMP="$(basename "$ARCHIVE" .tar.gz)"

if [ "$SIZE_BYTES" -gt "$MAX_BYTES" ]; then
  message="Sauvegarde Rwaresto bloquée : $STAMP pèse $SIZE_MB Mo (limite 30 Mo). Aucune archive n'a été envoyée. Une autre solution de stockage doit être choisie."
  log "$message"
  if send_text "$message"; then
    date -u +%Y-%m-%dT%H:%M:%SZ > "$OVERSIZE_STATE"
    chmod 600 "$OVERSIZE_STATE"
  fi
  exit 2
fi

log "Envoi de $ARCHIVE ($SIZE_MB Mo) vers Telegram…"
caption="Sauvegarde Rwaresto $STAMP — $SIZE_MB Mo — base SQLite uniquement, sans images."
if ! send_document "$ARCHIVE" "$caption"; then
  log "ERREUR : Telegram n'a pas confirmé la réception. La sauvegarde sera retentée."
  send_text "Échec de l'envoi de la sauvegarde Rwaresto ($STAMP, $SIZE_MB Mo). La sauvegarde sera retentée." || true
  exit 1
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "$SUCCESS_STATE"
chmod 600 "$SUCCESS_STATE"
rm -f "$OVERSIZE_STATE"
log "Sauvegarde Telegram confirmée : $ARCHIVE ($SIZE_MB Mo)."
