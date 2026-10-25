#!/usr/bin/env bash
set -euo pipefail

# Installation nginx + Certbot pour le domaine défini par SITE_URL dans .env.
# À exécuter en root depuis la racine du dépôt :
#   sudo bash scripts/setup-nginx.sh
#
# Le script ne touche qu'au vhost du domaine configuré. Il refuse de continuer
# si ce server_name est déjà défini ailleurs.

if [ "$(id -u)" -ne 0 ]; then
  echo "ERREUR : exécutez ce script avec sudo." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "${ROOT_DIR}/.env" ]; then
  SITE_URL="$(grep -E '^SITE_URL=' "${ROOT_DIR}/.env" | tail -1 | cut -d= -f2- | tr -d '"' || true)"
  DOMAIN="${SITE_URL#*://}"
  DOMAIN="${DOMAIN%%/*}"
fi
DOMAIN="${DOMAIN:-}"
if [ -z "${DOMAIN}" ]; then
  echo "ERREUR : définissez SITE_URL dans .env (ex. https://resto.mondomaine.fr)." >&2
  exit 1
fi
if [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "ERREUR : domaine invalide dans SITE_URL : ${DOMAIN}" >&2
  exit 1
fi
DEST="/etc/nginx/sites-available/${DOMAIN}.conf"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"
BOOTSTRAP="${ROOT_DIR}/deploy/nginx/bootstrap-rwaresto.conf"
TLS="${ROOT_DIR}/deploy/nginx/rwaresto.rwazap.com.conf"
ACME_ROOT="/var/www/certbot"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -f "${BOOTSTRAP}" ] || [ ! -f "${TLS}" ]; then
  echo "ERREUR : configurations nginx introuvables dans ${ROOT_DIR}/deploy/nginx." >&2
  exit 1
fi

if [ -f "${ROOT_DIR}/.env" ]; then
  PORT="$(grep -E '^HOST_PORT=' "${ROOT_DIR}/.env" | tail -1 | cut -d= -f2- | tr -d '"' || true)"
fi
PORT="${PORT:-3107}"
if ! [[ "${PORT}" =~ ^[0-9]+$ ]]; then
  echo "ERREUR : HOST_PORT invalide dans .env." >&2
  exit 1
fi

echo "→ Vérification des prérequis…"
command -v nginx >/dev/null || { echo "nginx absent." >&2; exit 1; }
command -v certbot >/dev/null || { echo "certbot absent." >&2; exit 1; }
if ! curl -fsS --max-time 5 "http://127.0.0.1:${PORT}/api/config" >/dev/null; then
  echo "ERREUR : l'application ne répond pas sur 127.0.0.1:${PORT}." >&2
  exit 1
fi
if ! ss -ltn | grep -qE ':(80|443)\b'; then
  echo "ERREUR : nginx n'écoute pas sur les ports 80/443." >&2
  exit 1
fi
if ! getent hosts "${DOMAIN}" >/dev/null; then
  echo "ERREUR : ${DOMAIN} ne résout pas." >&2
  exit 1
fi

CONFLICT="$(grep -R -l --exclude="$(basename "${DEST}")" \
  -E "server_name[^;]*${DOMAIN//./\\.}" \
  /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null || true)"
if [ -n "${CONFLICT}" ]; then
  echo "ERREUR : ${DOMAIN} est déjà déclaré dans :" >&2
  echo "${CONFLICT}" >&2
  exit 1
fi

mkdir -p "${ACME_ROOT}"

apply_config() {
  local source="$1"
  local backup=""
  local had_link=0

  if [ -f "${DEST}" ]; then
    backup="$(mktemp)"
    cp -a "${DEST}" "${backup}"
  fi
  if [ -L "${ENABLED}" ]; then
    had_link=1
  fi

  sed "s/127\\.0\\.0\\.1:3107/127.0.0.1:${PORT}/g" "${source}" > "${DEST}"
  ln -sfn "${DEST}" "${ENABLED}"

  if ! nginx -t; then
    echo "ERREUR : configuration nginx invalide, restauration." >&2
    if [ -n "${backup}" ]; then
      cp -a "${backup}" "${DEST}"
      rm -f "${backup}"
    else
      rm -f "${DEST}"
      [ "${had_link}" -eq 1 ] || rm -f "${ENABLED}"
    fi
    nginx -t && systemctl reload nginx || true
    exit 1
  fi
  rm -f "${backup}"
  systemctl reload nginx
}

if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
  echo "→ Installation du vhost HTTP temporaire pour Certbot…"
  apply_config "${BOOTSTRAP}"

  echo "→ Demande du certificat pour ${DOMAIN} uniquement…"
  certbot certonly --webroot -w "${ACME_ROOT}" \
    -d "${DOMAIN}" --cert-name "${DOMAIN}" \
    --deploy-hook "systemctl reload nginx"

  if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "ERREUR : certificat absent après Certbot." >&2
    exit 1
  fi
fi

echo "→ Activation du vhost HTTPS…"
apply_config "${TLS}"

echo "→ Vérification HTTPS…"
curl -fsS --max-time 15 "https://${DOMAIN}/api/config" >/dev/null
echo "✓ https://${DOMAIN} est opérationnel."
certbot certificates --cert-name "${DOMAIN}" 2>/dev/null | sed -n '/Certificate Name/,+4p' || true
