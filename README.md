# Rwaresto

Application web mobile-first de commande à table pour restaurant. Le client scanne un QR code, compose sa commande, suit la préparation en temps réel et paie à la caisse. Aucun paiement en ligne n'est nécessaire.

## Fonctionnalités

- Carte publique par catégories, recherche, fiches produits avec options, quantités et notes.
- Panier persistant, mode sur place (table) ou à emporter, pseudo anti-collision par table.
- Suivi de commande en direct (SSE + repli par actualisation), chronologie et notification sonore.
- Caisse : tableau kanban temps réel, recherche par table/pseudo/numéro, validation, préparation, encaissement espèces/carte, annulation motivée.
- Gestion complète du menu : catégories, plats, photos, prix, options, badges, épuisé/masqué, archivage, réordonnancement.
- Tables et QR codes : PNG, SVG, planche A4 imprimable.
- Utilisateurs `admin` et `cashier`, changement de mot de passe forcé, protection du dernier administrateur.
- Paramètres du restaurant : identité, logo, couleurs, devise, horaires, fermeture manuelle.
- Statistiques du jour, export CSV, journal d'audit.
- PWA, SEO (admin en `noindex`), images WebP, accessibilité clavier et contrastes.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Prisma 6 · SQLite · Zod · bcryptjs · Sharp · Vitest · Docker.

## Démarrage local

Prérequis : Node.js 22+, npm. Aucun service externe n'est requis.

```bash
cp .env.example .env
# Renseigner ADMIN_PASSWORD, SESSION_SECRET (openssl rand -base64 48) et SITE_URL
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

- Site : http://localhost:3000
- Administration : http://localhost:3000/admin
- Le compte initial est défini par `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Changez le mot de passe après la première connexion.

Pour repartir d'une base vierge en local : `rm prisma/dev.db && npx prisma migrate deploy && npx prisma db seed`.

## Qualité

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

La CI GitHub Actions exécute ces étapes et construit l'image Docker.

## Configuration

Toutes les variables sont documentées dans `.env.example`. Les principales :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` en local, `file:/data/rwaresto.db` en Docker |
| `SESSION_SECRET` | Signature HMAC des sessions, 24 caractères minimum |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Compte créé au premier démarrage uniquement |
| `SITE_URL` | URL publique HTTPS, sans slash final |
| `HOST_PORT` | Port local du conteneur, `3107` par défaut |
| `CURRENCY` / `LOCALE` | Devise et format des montants |
| `ORDER_RATE_LIMIT` / `ORDER_RATE_WINDOW_SECONDS` | Limite anti-spam des commandes |

Les secrets ne doivent jamais être commités. `.env` est ignoré par Git.

## Docker

```bash
cp .env.example .env   # renseigner les secrets
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

L'application écoute uniquement sur `127.0.0.1:${HOST_PORT}`. Les migrations et le seed idempotent sont exécutés au démarrage. Les données (SQLite + photos) sont conservées dans le volume `rwaresto_data`.

Le reverse proxy n'est pas embarqué : le nginx de l'hôte expose le site en HTTPS. Voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Sauvegarde et restauration

```bash
./scripts/backup.sh
./scripts/restore.sh backups/rwaresto-AAAAMMJJ-HHMMSS.tar.gz
```

La sauvegarde utilise `sqlite3 .backup` pour obtenir un fichier cohérent, puis archive la base et le dossier `uploads`. Conservez les archives hors du VPS et testez régulièrement une restauration.

## Structure

```text
src/app/(site)          Parcours public (accueil, menu, suivi)
src/app/admin           Interface de caisse et d'administration
src/app/api             API publiques, authentification et administration
src/components          Composants client, panier, caisse, éditeurs
src/lib                 Sessions, tarification, horaires, SSE, audit
prisma                  Schéma, migrations et seed
deploy/nginx            Configurations nginx (bootstrap HTTP et TLS)
scripts                 Sauvegarde et restauration
tests                   Tests Vitest
```

## Paiement

Le paiement en ligne est volontairement absent. Le modèle de données prévoit déjà `paymentStatus`, `paymentMethod` et les statuts d'encaissement, afin d'ajouter un prestataire plus tard sans refonte du parcours.
