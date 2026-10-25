#!/usr/bin/env bash
set -euo pipefail

# Installation interactive de Rwaresto.
# À lancer depuis la racine du dépôt : ./scripts/install.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

say() { printf '\n\033[1;32m%s\033[0m\n' "$*"; }
err() { printf '\n\033[1;31m%s\033[0m\n' "$*" >&2; }

env_quote() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if ! command -v docker >/dev/null 2>&1; then
  err "Docker n'est pas installé. Installez Docker puis relancez ce script."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose n'est pas disponible. Installez le plugin docker-compose puis relancez."
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  err "curl n'est pas installé. Installez curl puis relancez."
  exit 1
fi

say "Bienvenue dans l'installation de Rwaresto."

if [ -f .env ]; then
  read -r -p "Un fichier .env existe déjà. Le remplacer ? [o/N] " replace
  if [[ ! "$replace" =~ ^[oOyY]$ ]]; then
    echo "Installation annulée. Le fichier .env existant est conservé."
    exit 0
  fi
fi

read -r -p "Nom du site/restaurant [Rwaresto] : " restaurant_name
restaurant_name="${restaurant_name:-Rwaresto}"
if [ "${#restaurant_name}" -lt 2 ] || [ "${#restaurant_name}" -gt 80 ]; then
  err "Le nom doit contenir entre 2 et 80 caractères."
  exit 1
fi

while true; do
  read -r -p "URL publique du site (ex. https://resto.mondomaine.fr) : " site_url
  site_url="${site_url%/}"
  if [[ "$site_url" =~ ^https?://[^/]+$ ]]; then break; fi
  err "URL invalide. Exemple attendu : https://resto.mondomaine.fr"
done

read -r -p "Port interne du site [3107] : " host_port
host_port="${host_port:-3107}"
if [[ ! "$host_port" =~ ^[0-9]+$ ]] || [ "$host_port" -lt 1 ] || [ "$host_port" -gt 65535 ]; then
  err "Port invalide."
  exit 1
fi

read -r -p "Identifiant administrateur [admin] : " admin_username
admin_username="${admin_username:-admin}"
if [[ ! "$admin_username" =~ ^[A-Za-z0-9_-]+$ ]]; then
  err "L'identifiant ne doit contenir que lettres, chiffres, tirets et underscores."
  exit 1
fi

while true; do
  read -r -s -p "Mot de passe administrateur (12 caractères minimum) : " admin_password
  echo
  if [ "${#admin_password}" -lt 12 ]; then
    err "Le mot de passe doit contenir au moins 12 caractères."
    continue
  fi
  if [[ ! "$admin_password" =~ [A-Za-z] ]] || [[ ! "$admin_password" =~ [0-9] ]]; then
    err "Le mot de passe doit contenir au moins une lettre et un chiffre."
    continue
  fi
  if ! printf '%s' "$admin_password" | grep -qE '^[A-Za-z0-9!@#%^&*()_+.,:;?=-]+$'; then
    err "Utilisez uniquement lettres, chiffres et symboles simples (sans \$ ni guillemets)."
    continue
  fi
  read -r -s -p "Confirmez le mot de passe : " admin_password_confirm
  echo
  if [ "$admin_password" != "$admin_password_confirm" ]; then
    err "Les mots de passe ne correspondent pas."
    continue
  fi
  break
done

session_secret="$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '\n')"

cat > .env <<ENV
DATABASE_URL="file:./dev.db"
RESTAURANT_NAME="$(env_quote "$restaurant_name")"
ADMIN_USERNAME="$(env_quote "$admin_username")"
ADMIN_PASSWORD="$(env_quote "$admin_password")"
SESSION_SECRET="$(env_quote "$session_secret")"
SITE_URL="$(env_quote "$site_url")"
CURRENCY="EUR"
LOCALE="fr-FR"
HOST_PORT=$host_port
UPLOAD_DIR="/data/uploads"
ORDER_RATE_LIMIT=8
ORDER_RATE_WINDOW_SECONDS=60
ENV
chmod 600 .env

say "Configuration créée dans .env (permissions 600)."
echo "Nom du site : $restaurant_name"
echo "URL publique : $site_url"
echo "Administrateur : $admin_username"
echo "Le mot de passe n'est pas affiché."

read -r -p "Démarrer le site maintenant ? [O/n] " start_now
if [[ "$start_now" =~ ^[nN]$ ]]; then
  echo "Vous pourrez démarrer avec : docker compose up -d --build"
  exit 0
fi

say "Construction et démarrage du conteneur…"
docker compose up -d --build

say "Attente du démarrage de l'application…"
ready=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${host_port}/api/config" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != "1" ]; then
  err "L'application ne répond pas encore. Consultez : docker compose logs --tail=150 app"
  exit 1
fi

say "Le site est démarré."
echo "Administration locale : http://127.0.0.1:${host_port}/admin"
echo "Identifiant : $admin_username"
echo
echo "Étapes suivantes :"
echo "1. Connectez votre nom de domaine au VPS (enregistrement DNS A)."
echo "2. Configurez nginx et HTTPS : sudo bash scripts/setup-nginx.sh"
echo "3. Ouvrez ${site_url}/admin et connectez-vous."
echo "4. Changez le mot de passe depuis « Changer mon mot de passe »."
echo "5. Personnalisez le menu, les photos, les prix et les tables."
echo
echo "Pour les sauvegardes automatiques, voir docs/EXPLOITATION.md."
