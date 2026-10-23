#!/usr/bin/env bash
set -euo pipefail

# Vérifications HTTP de production, sans authentification.
# Usage : SITE_URL=https://rwaresto.rwazap.com ./scripts/smoke-test.sh

BASE_URL="${SITE_URL:-https://rwaresto.rwazap.com}"
BASE_URL="${BASE_URL%/}"
FAILURES=0

check_status() {
  local path="$1"
  local expected="$2"
  local status
  status="$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$BASE_URL$path" || true)"
  if [ "$status" = "$expected" ]; then
    printf '✓ %-24s %s\n' "$path" "$status"
  else
    printf '✗ %-24s attendu %s, reçu %s\n' "$path" "$expected" "$status" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

echo "Tests de disponibilité : $BASE_URL"
check_status "/" 200
check_status "/menu" 200
check_status "/rgpd" 200
check_status "/admin" 307
check_status "/admin/login" 200
check_status "/sitemap.xml" 200
check_status "/robots.txt" 200
check_status "/api/config" 200
check_status "/api/menu" 200
check_status "/manifest.webmanifest" 200

if ! curl -fsS --max-time 15 "$BASE_URL/api/config" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("restaurantName"); assert isinstance(d.get("isOpen"), bool)' 2>/dev/null; then
  echo "✗ /api/config ne contient pas les champs attendus." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! curl -fsS --max-time 15 "$BASE_URL/api/menu" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert isinstance(d.get("categories"), list); assert d.get("service", {}).get("mode") in ("breakfast","full","closed")' 2>/dev/null; then
  echo "✗ /api/menu ne contient pas les champs attendus." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! curl -fsS --max-time 15 "$BASE_URL/robots.txt" | grep -q "Sitemap: $BASE_URL/sitemap.xml"; then
  echo "✗ robots.txt ne référence pas le bon sitemap." >&2
  FAILURES=$((FAILURES + 1))
fi

REDIRECT="$(curl -sS -o /dev/null --max-time 15 -w '%{http_code} %{redirect_url}' "http://${BASE_URL#https://}/" || true)"
if [ "${REDIRECT%% *}" = "301" ] || [ "${REDIRECT%% *}" = "308" ]; then
  echo "✓ redirection HTTP vers HTTPS"
else
  echo "✗ redirection HTTP vers HTTPS absente ($REDIRECT)" >&2
  FAILURES=$((FAILURES + 1))
fi

if [ "$FAILURES" -gt 0 ]; then
  echo "Échec : $FAILURES vérification(s)." >&2
  exit 1
fi
echo "Tous les tests sont passés."
