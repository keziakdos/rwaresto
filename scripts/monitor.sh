#!/usr/bin/env bash
set -euo pipefail

# Surveillance HTTP simple de Rwaresto.
# Variables optionnelles :
#   SITE_URL, CHECK_PATH, STATE_FILE, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
#   ALERT_WEBHOOK_URL, NTFY_TOPIC

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_URL="${SITE_URL:-https://rwaresto.rwazap.com}"
CHECK_PATH="${CHECK_PATH:-/api/config}"
STATE_FILE="${STATE_FILE:-$ROOT_DIR/.monitor-state}"
NTFY_TOPIC="${NTFY_TOPIC:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
TIMEOUT="${TIMEOUT:-15}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

send_alert() {
  local message="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -fsS --max-time 10 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"       --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}"       --data-urlencode "text=${message}"       --data-urlencode "disable_web_page_preview=true" >/dev/null || true
  elif [ -n "$ALERT_WEBHOOK_URL" ]; then
    curl -fsS --max-time 10 -X POST -H "Content-Type: text/plain" --data "$message" "$ALERT_WEBHOOK_URL" >/dev/null || true
  elif [ -n "$NTFY_TOPIC" ]; then
    curl -fsS --max-time 10 -H "Title: Rwaresto" -d "$message" "https://ntfy.sh/$NTFY_TOPIC" >/dev/null || true
  else
    echo "[ALERTE] $message" >&2
  fi
}

STATUS="$(curl -sS -o /dev/null --max-time "$TIMEOUT" -w '%{http_code}' "${SITE_URL}${CHECK_PATH}" 2>/dev/null || true)"
if [ "$STATUS" = "200" ]; then
  if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null || true)" = "down" ]; then
    send_alert "Rwaresto est de nouveau disponible ($SITE_URL) — $NOW"
    echo "$NOW rétabli $SITE_URL" >&2
  fi
  printf 'up' > "$STATE_FILE"
  exit 0
fi

if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null || true)" = "down" ]; then
  exit 1
fi

printf 'down' > "$STATE_FILE"
MESSAGE="Rwaresto est indisponible (HTTP ${STATUS:-timeout}) — $SITE_URL — $NOW"
send_alert "$MESSAGE"
echo "$MESSAGE" >&2
exit 1
