#!/bin/sh
set -eu

export PATH="/app/node_modules/.bin:$PATH"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERREUR : DATABASE_URL est requis (ex. file:/data/rwaresto.db)." >&2
  exit 1
fi

if [ -z "${SESSION_SECRET:-}" ] || [ "${#SESSION_SECRET}" -lt 24 ]; then
  echo "ERREUR : SESSION_SECRET doit contenir au moins 24 caractères." >&2
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "AVERTISSEMENT : ADMIN_PASSWORD absent. Aucun administrateur ne sera créé au premier démarrage." >&2
fi

mkdir -p "${UPLOAD_DIR:-/data/uploads}"

echo "Application des migrations Prisma…"
./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

echo "Vérification des données initiales (idempotent)…"
./node_modules/.bin/prisma db seed --schema prisma/schema.prisma

echo "Démarrage du serveur Next.js…"
exec ./node_modules/.bin/next start -H 0.0.0.0 -p 3000
