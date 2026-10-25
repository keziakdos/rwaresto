# Sécurité — audit et recommandations

Dernière vérification : 2026-10-25

## Synthèse

L'application Rwaresto présente une base solide : authentification protégée, sessions signées, mots de passe bcrypt, validation des entrées, limitation de débit, uploads contrôlés, conteneur non-root, HTTPS et en-têtes de sécurité. Aucun secret n'est présent dans le dépôt Git.

Aucune faille critique directement exploitable n'a été identifiée dans le code de l'application. Les principaux risques restants concernent l'infrastructure du VPS et les dépendances.

## Mesures déjà en place

- HTTPS avec TLS 1.2/1.3 et certificat Let's Encrypt valide.
- Redirection HTTP vers HTTPS.
- HSTS activé.
- En-têtes `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`.
- Pages admin en `noindex`.
- Sessions HMAC signées, cookie `httpOnly`, `Secure`, `SameSite=Lax`, expiration 7 jours.
- Mots de passe hachés avec bcrypt (coût 12).
- Invalidation des sessions par `sessionVersion`.
- Limitation des tentatives de connexion : 6 par identifiant/IP et 20 par IP toutes les 15 minutes.
- Protection CSRF par contrôle d'origine et `SameSite`.
- Toutes les API d'administration exigent un rôle authentifié.
- Validation Zod des entrées.
- Accès base via Prisma, sans concaténation SQL.
- Upload limité à 8 Mo, types raster contrôlés, traitement Sharp, noms aléatoires.
- Lecture des uploads protégée contre la traversée de répertoire.
- Lien de suivi de commande protégé par un token non devinable.
- Conteneur Docker non-root, sans privilèges supplémentaires, avec toutes les capabilities supprimées.
- Port applicatif `3107` accessible uniquement en local.
- Sauvegardes locales en `chmod 600` et archives Telegram sans images.

## Points à améliorer

### 1. Pare-feu et services exposés — priorité haute

Le pare-feu UFW est actuellement désactivé. Le port **5678 (n8n)** est accessible publiquement sur `0.0.0.0`, en plus de 22/80/443.

À faire :

- vérifier si n8n doit vraiment être accessible depuis Internet ;
- si non, le lier à `127.0.0.1` et passer par nginx avec authentification ;
- sinon, restreindre l'accès par IP ou par VPN ;
- activer un pare-feu.

Commandes indicatives après avoir vérifié les services nécessaires :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

Attention : Docker peut court-circuiter UFW selon la configuration des ports publiés. Vérifier avec `sudo ss -ltnp` après activation.

### 2. Protection SSH — priorité haute

Déjà en place : `PermitRootLogin no` et `PasswordAuthentication no`.

À compléter :

```bash
sudo apt update
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

Désactiver X11Forwarding :

```bash
sudo sed -i 's/^X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload ssh
```

### 3. En-têtes HTTP — priorité moyenne

Une politique CSP n'est pas encore définie. L'ajouter en `Content-Security-Policy-Report-Only` avant de la rendre bloquante, à cause des scripts inline de Next.js et du thème.

Ajouter aussi côté nginx `server_tokens off;` (déjà dans les modèles du dépôt) pour masquer la version de nginx.

Pour le serveur actuel :

```bash
sudo grep -q 'server_tokens off;' /etc/nginx/sites-available/rwaresto.rwazap.com.conf || \
  sudo sed -i '/^server {/a\    server_tokens off;' /etc/nginx/sites-available/rwaresto.rwazap.com.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Dépendances — priorité moyenne

`npm audit` remonte des avis sur Zod, PostCSS et Prisma.

- **Zod** : avis de consommation mémoire ; les schémas limitent déjà les tailles, mais une mise à jour vers Zod 4 est à planifier.
- **PostCSS / Next** : concernent principalement la chaîne de build, absente de l'image d'exécution.
- **Prisma CLI** : la CLI n'est pas présente dans l'image d'exécution.

Ne pas lancer `npm audit fix --force` directement : cela effectue des montées majeures Next/Prisma/Zod. Prévoir une branche de maintenance et des tests complets.

### 5. Authentification admin — priorité moyenne

- Le mot de passe initial est stocké dans `.env`. Après la première connexion et le changement de mot de passe, il peut être retiré ou vidé.
- Envisager une authentification à deux facteurs (TOTP) pour les comptes admin.
- Éviter de partager le compte admin ; créer un compte caisse par employé.
- Réduire éventuellement la durée de session admin de 7 jours à 24 heures.

### 6. Sauvegardes — priorité moyenne

Les archives de configuration contiennent `.env` et donc des secrets.

- conserver les archives en `chmod 600` ;
- chiffrer les archives avant un stockage externe ;
- limiter l'accès au compte Telegram utilisé pour les sauvegardes ;
- tester régulièrement une restauration.

### 7. Surveillance

- Surveiller les connexions échouées et les erreurs 401/403 dans les logs.
- Mettre en place un contrôle d'intégrité ou une alerte sur les modifications de `.env`.
- Vérifier régulièrement les mises à jour de sécurité de Docker, nginx, Certbot et du système.

## Vérifications utiles

```bash
# Ports en écoute
sudo ss -ltnp

# Pare-feu
sudo ufw status verbose

# Fail2ban
sudo fail2ban-client status

# Certificat TLS
echo | openssl s_client -servername rwaresto.rwazap.com -connect rwaresto.rwazap.com:443 2>/dev/null | openssl x509 -noout -dates

# Dépendances
npm audit

# En-têtes HTTP
curl -sS -D - -o /dev/null https://rwaresto.rwazap.com/
```

## Secrets

Aucun token, mot de passe ou clé privée n'a été trouvé dans les fichiers suivis par Git ni dans l'historique analysé. Les fichiers `.env`, `.monitor.env` et `.backup.env` ne sont pas versionnés.
