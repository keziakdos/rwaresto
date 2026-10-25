# Rwaresto

Application web mobile-first de commande à table pour restaurant. Le client scanne un QR code, compose sa commande, suit la préparation en temps réel et paie à la caisse. Aucun paiement en ligne n'est nécessaire.

## Fonctionnalités

- Carte publique par catégories, recherche, fiches produits avec options, quantités et notes.
- Panier persistant, mode sur place (table) ou à emporter, pseudo anti-collision par table.
- Suivi de commande en direct (SSE + repli par actualisation), chronologie et notification sonore.
- Caisse : tableau kanban temps réel, recherche par table/pseudo/numéro, validation, préparation, encaissement espèces/carte, annulation motivée.
- Gestion complète du menu : catégories, plats, photos, prix, options, badges, épuisé/masqué, archivage, réordonnancement, plats mis en avant, menus spéciaux datés.
- Tables et QR codes : PNG, SVG, planche A4 imprimable.
- Utilisateurs `admin` et `cashier`, changement de mot de passe, protection du dernier administrateur.
- Paramètres du restaurant : nom, logo, couleurs, devise, horaires, fermeture manuelle.
- Statistiques avancées : CA, ticket moyen, annulations, graphique, top produits, catégories, heures de pointe, paiements, détail des commandes.
- PWA, SEO, images WebP, accessibilité clavier et contrastes.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Prisma 6 · SQLite · Zod · bcryptjs · Sharp · Vitest · Docker.

## Installation complète sur un nouveau VPS

Ce guide part d'un VPS vide. Les commandes sont à exécuter en SSH, idéalement en root pour une première installation.

### Prérequis

- VPS Ubuntu 22.04 ou 24.04, **2 Go de RAM recommandés**.
- Un nom de domaine dont le DNS pointe vers l'adresse IP du VPS (enregistrement `A`).
- Un accès SSH au VPS.

### 1. Se connecter au VPS

```bash
ssh root@ADRESSE_IP_DU_VPS
```

Remplacez `ADRESSE_IP_DU_VPS` par l'adresse fournie par votre hébergeur.

### 2. Installer les prérequis

```bash
apt update && apt upgrade -y
apt install -y git curl openssl ca-certificates nginx certbot
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

La dernière commande doit afficher une version de Docker Compose.

### 3. Télécharger le site depuis GitHub

```bash
mkdir -p /opt/rwaresto
cd /opt/rwaresto
git clone https://github.com/keziakdos/rwaresto.git .
```

### 4. Configurer et lancer le site

```bash
cd /opt/rwaresto
bash scripts/install.sh
```

Le script vous demande :

- le **nom du site** ;
- l'**URL publique** (ex. `https://resto.mondomaine.fr`) ;
- le **port interne** (laisser `3107`) ;
- l'**identifiant administrateur** ;
- le **mot de passe administrateur**, que vous définissez vous-même.

Le mot de passe doit contenir au moins **12 caractères**, avec au moins une lettre et un chiffre. Il n'est pas affiché. Le script crée `.env`, construit l'image Docker et démarre le site.

### 5. Configurer le domaine et HTTPS

Le DNS de votre domaine doit déjà pointer vers le VPS. Vérifiez-le avec :

```bash
getent hosts resto.mondomaine.fr
```

Puis lancez :

```bash
cd /opt/rwaresto
sudo bash scripts/setup-nginx.sh
```

Le script lit automatiquement `SITE_URL` dans `.env`, installe le vhost nginx de votre domaine et demande le certificat HTTPS avec Certbot. Le site sera ensuite disponible sur votre domaine.

### 6. Première connexion

Ouvrez :

```text
https://VOTRE_DOMAINE/admin
```

Connectez-vous avec l'identifiant et le mot de passe choisis à l'installation.

- Cliquez sur **Changer mon mot de passe** dans la barre latérale pour définir un mot de passe définitif.
- Le nom du site peut être modifié dans **Paramètres → Identité**.
- Le logo, les couleurs, la devise et les horaires se règlent aussi dans **Paramètres**.

### 7. Adapter le menu

Au premier démarrage, un menu de démonstration est créé.

Dans **Admin → Menu** :

1. Supprimez ou archivez les plats de démonstration.
2. Ajoutez vos plats avec **Ajouter un plat**.
3. Renseignez le nom, la description, le prix et la catégorie.
4. Ajoutez une photo depuis l'éditeur du plat.
5. Cochez **Plat spécial** pour le mettre en avant dans la section « Le coup de cœur ».
6. Utilisez **Disponible**, **Masqué** ou **Supprimer/Archiver** pour retirer un plat de la vente.
7. Créez des catégories et des **menus spéciaux datés** (ex. Saint-Valentin) dans **Catégories & services**.

### 8. Tables et QR codes

Dans **Admin → Tables & QR codes** :

1. Créez les tables de votre salle.
2. Téléchargez les QR codes PNG/SVG ou imprimez la planche A4.
3. Placez les QR codes sur les tables.
4. Testez un scan et une commande complète.

### 9. Sauvegardes

Sauvegarde manuelle :

```bash
cd /opt/rwaresto
./scripts/backup-site.sh
```

Les sauvegardes locales sont conservées 10 jours et contiennent la base SQLite sans les images, plus la configuration. La configuration de la sauvegarde Telegram est décrite dans [docs/EXPLOITATION.md](docs/EXPLOITATION.md).

Les images téléversées ne sont pas incluses dans les archives. Pensez à conserver une copie séparée de `/var/lib/docker/volumes/rwaresto_data/_data/uploads` si nécessaire.

### 10. Mettre à jour le site

```bash
cd /opt/rwaresto
./scripts/backup.sh
git pull --ff-only
docker compose up -d --build
docker compose ps
```

### En cas de problème

```bash
cd /opt/rwaresto
docker compose ps
docker compose logs --tail=150 app
```

- **Le site ne répond pas** : vérifier `docker compose ps`, puis les logs.
- **Certificat HTTPS impossible** : vérifier que le DNS pointe vers le VPS et que les ports 80/443 sont ouverts.
- **Port déjà utilisé** : changer `HOST_PORT` dans `.env`, puis relancer `docker compose up -d`.
- **Mot de passe admin perdu** : demander une réinitialisation sur le serveur, ne pas supprimer la base.

## Développement local

Prérequis : Node.js 22+, npm.

```bash
cp .env.example .env
# Renseigner RESTAURANT_NAME, ADMIN_PASSWORD, SESSION_SECRET et SITE_URL
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

- Site : http://localhost:3000
- Administration : http://localhost:3000/admin

Pour repartir d'une base vierge en local : `rm prisma/dev.db && npx prisma migrate deploy && npx prisma db seed`.

## Configuration

Toutes les variables sont documentées dans `.env.example`. Les principales :

| Variable | Rôle |
| --- | --- |
| `RESTAURANT_NAME` | Nom initial du site, modifiable ensuite dans Paramètres |
| `DATABASE_URL` | `file:./dev.db` en local, `file:/data/rwaresto.db` en Docker |
| `SESSION_SECRET` | Signature HMAC des sessions, 24 caractères minimum |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Compte créé au premier démarrage uniquement |
| `SITE_URL` | URL publique HTTPS, sans slash final |
| `HOST_PORT` | Port local du conteneur, `3107` par défaut |
| `CURRENCY` / `LOCALE` | Devise et format des montants |
| `ORDER_RATE_LIMIT` / `ORDER_RATE_WINDOW_SECONDS` | Limite anti-spam des commandes |

Les secrets ne doivent jamais être commités. `.env` est ignoré par Git et doit rester en `chmod 600`.

## Qualité

```bash
npm run typecheck
npm run lint
npm run test
npm run build
SITE_URL=https://votre-domaine.fr ./scripts/smoke-test.sh
```

La CI GitHub Actions exécute ces étapes et construit l'image Docker.

## Structure

```text
src/app/(site)          Parcours public (accueil, menu, suivi)
src/app/admin           Interface de caisse et d'administration
src/app/api             API publiques, authentification et administration
src/components          Composants client, panier, caisse, éditeurs
src/lib                 Sessions, tarification, horaires, SSE, audit
prisma                  Schéma, migrations et seed
deploy/nginx            Configurations nginx (bootstrap HTTP et TLS)
scripts                 Installation, sauvegarde, restauration, surveillance
tests                   Tests Vitest
```

## Documentation

- [Installation et exploitation](docs/EXPLOITATION.md)
- [Déploiement détaillé sur le VPS actuel](docs/DEPLOIEMENT.md)
- [Plan de reprise](PLAN_DE_REPRISE.md)

## Paiement

Le paiement en ligne est volontairement absent. Le modèle de données prévoit déjà `paymentStatus`, `paymentMethod` et les statuts d'encaissement, afin d'ajouter un prestataire plus tard sans refonte du parcours.
