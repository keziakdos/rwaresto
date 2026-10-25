# Déploiement sur le VPS

Ce document décrit le VPS Rwaresto existant et son domaine actuel. Pour une nouvelle installation complète sur un autre VPS, suivez d'abord le guide pas à pas du [README](../README.md).

Cible actuelle : `https://rwaresto.rwazap.com` sur le VPS existant, sans modifier les autres sites, conteneurs, certificats ou configurations nginx.

Le conteneur écoute sur `127.0.0.1:3107`. Le nginx de l'hôte termine TLS et proxyfie vers ce port. Le port 3107 ne doit jamais être exposé publiquement.

## 1. Audit lecture seule

À exécuter avant toute modification :

```bash
whoami
docker --version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
sudo ss -ltnp | grep -E ':(80|443|3107)\b' || true
sudo nginx -t
sudo nginx -T 2>/dev/null | grep -n 'server_name\|listen' | head -40
ls -la /etc/nginx/sites-enabled/
getent hosts rwaresto.rwazap.com
```

Vérifier que :

- le DNS `rwaresto.rwazap.com` pointe vers le VPS ;
- le port 3107 est libre ;
- aucun `server_name rwaresto.rwazap.com` n'existe déjà ;
- les conteneurs existants ne publient pas déjà ce port.

Ne pas arrêter, recréer ou modifier un conteneur existant. Ne pas remplacer la configuration nginx globale.

## 2. Installation de l'application

```bash
sudo mkdir -p /opt/rwaresto
sudo chown "$USER":"$USER" /opt/rwaresto
git clone https://github.com/keziakdos/rwaresto.git /opt/rwaresto
cd /opt/rwaresto
cp .env.example .env
chmod 600 .env
```

Éditer `.env` :

```bash
nano .env
```

Valeurs indispensables :

```dotenv
SITE_URL="https://rwaresto.rwazap.com"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="un-mot-de-passe-initial-long-et-unique"
SESSION_SECRET="sortie-de-openssl-rand-base64-48"
HOST_PORT=3107
CURRENCY="EUR"
LOCALE="fr-FR"
```

Générer le secret :

```bash
openssl rand -base64 48
```

Construire et démarrer :

```bash
cd /opt/rwaresto
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Attendre `healthy`, puis vérifier en local :

```bash
curl -fsS http://127.0.0.1:3107/api/config
```

## 3. Nginx et Certbot (script automatisé)

Une fois l'application démarrée et saine, le script suivant installe uniquement le vhost `rwaresto.rwazap.com`, obtient le certificat avec Certbot, puis active HTTPS. Il vérifie les conflits et restaure la configuration précédente en cas d'échec.

```bash
cd /opt/rwaresto
sudo bash scripts/setup-nginx.sh
```

Le script refuse de continuer si le nom est déjà déclaré ailleurs. `nginx -t` est exécuté avant chaque rechargement et `reload` est utilisé, jamais `restart`.

Les étapes manuelles ci-dessous restent disponibles en cas de besoin.

## 3. Nginx HTTP temporaire pour Certbot

S'assurer que le dossier ACME existe :

```bash
sudo mkdir -p /var/www/certbot
```

Créer le site temporaire :

```bash
sudo cp /opt/rwaresto/deploy/nginx/bootstrap-rwaresto.conf \
  /etc/nginx/sites-available/rwaresto.rwazap.com.conf
sudo ln -s /etc/nginx/sites-available/rwaresto.rwazap.com.conf \
  /etc/nginx/sites-enabled/rwaresto.rwazap.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

Tester le challenge :

```bash
curl -I http://rwaresto.rwazap.com/
```

Le certificat est demandé uniquement pour ce domaine :

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d rwaresto.rwazap.com --dry-run
sudo certbot certonly --webroot -w /var/www/certbot \
  -d rwaresto.rwazap.com
```

Si un autre nom apparaît dans la sortie Certbot, s'arrêter : la commande doit cibler uniquement `rwaresto.rwazap.com`.

## 4. Nginx HTTPS

Remplacer la configuration temporaire :

```bash
sudo cp /opt/rwaresto/deploy/nginx/rwaresto.rwazap.com.conf \
  /etc/nginx/sites-available/rwaresto.rwazap.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

`reload` uniquement, jamais `restart` : les autres sites ne sont pas interrompus.

Vérifications :

```bash
curl -I http://rwaresto.rwazap.com/
curl -I https://rwaresto.rwazap.com/
curl -fsS https://rwaresto.rwazap.com/api/config
```

Attendu : redirection HTTP vers HTTPS, `200` en HTTPS, en-têtes de sécurité présents.

## 5. Première connexion

1. Ouvrir `https://rwaresto.rwazap.com/admin`.
2. Se connecter avec `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. Changer immédiatement le mot de passe proposé.
4. Vérifier les paramètres (nom, adresse, horaires, devise, couleurs).
5. Remplacer le menu de démonstration par la carte réelle.
6. Créer les tables et imprimer les QR codes.
7. Créer un compte `cashier` pour la caisse.
8. Tester une commande complète : validation, préparation, encaissement.

Le seed de démonstration ne s'exécute qu'une fois. Il ne recrée pas le catalogue après suppression.

## 6. Sauvegardes

Créer le dossier local :

```bash
cd /opt/rwaresto
mkdir -p backups
```

Test manuel :

```bash
./scripts/backup.sh
ls -lh backups/
```

Automatisation quotidienne à 3 h 15 :

```bash
crontab -e
```

```cron
15 3 * * * cd /opt/rwaresto && BACKUP_DIR=/opt/rwaresto/backups ./scripts/backup.sh >> /var/log/rwaresto-backup.log 2>&1
```

Prévoir une copie hors du VPS (rsync, stockage objet) et une durée de rétention adaptée. La variable `KEEP_DAYS` vaut 30 jours par défaut.

## 7. Mises à jour

```bash
cd /opt/rwaresto
./scripts/backup.sh
git pull --ff-only
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Les migrations sont appliquées automatiquement au démarrage. En cas de problème, restaurer la sauvegarde créée juste avant.

## 8. Exploitation quotidienne

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose restart app
```

- Redémarrer l'application seule : `docker compose restart app`.
- Arrêter le site : `docker compose stop app`.
- Ne jamais supprimer le volume `rwaresto_data` sans sauvegarde.
- Renouvellement TLS : `sudo certbot renew --dry-run`.
- Vérifier l'espace disque : `df -h` et la taille des sauvegardes.

## 9. Dépannage

**Le conteneur redémarre en boucle**

```bash
docker compose logs --tail=200 app
```

Vérifier `SESSION_SECRET` (24 caractères minimum), `DATABASE_URL` et les droits du volume.

**Erreur 502 nginx**

```bash
curl -fsS http://127.0.0.1:3107/api/config
docker compose ps
```

Si le port local ne répond pas, consulter les journaux du conteneur.

**Les photos ne s'affichent pas**

Vérifier que `UPLOAD_DIR=/data/uploads` et que le volume `rwaresto_data` est monté sur `/data` :

```bash
docker compose exec app ls -la /data/uploads
```

**Certificat absent**

Ne pas recharger nginx avec la configuration TLS tant que les fichiers `/etc/letsencrypt/live/rwaresto.rwazap.com/` n'existent pas. Revenir à la configuration bootstrap, obtenir le certificat, puis réappliquer la configuration TLS.
