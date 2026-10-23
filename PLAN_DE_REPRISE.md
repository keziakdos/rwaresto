# Plan de reprise — Rwaresto

Dernière mise à jour : 2026-10-23

## État du projet

Le site est en production sur `https://rwaresto.rwazap.com`, avec HTTPS, PWA, commande à table, suivi client, caisse, administration du menu, QR codes, alertes Telegram et documentation d'exploitation.

### Terminé

- Parcours client mobile-first et administration redesignés.
- Menu par services : petit-déjeuner 09h00–11h00, carte complète à partir de 11h00, fermeture à 01h00.
- Fermeture hebdomadaire le lundi.
- Petit-déjeuner détaillé avec produits individuels.
- Section végétalienne dynamique et badges végan.
- 10 plats supplémentaires ajoutés avec prix provisoires.
- Page RGPD et lien dans le footer.
- Lien « Changer mon mot de passe » dans l'administration.
- Surveillances HTTP et alertes Telegram.
- Sauvegardes locales quotidiennes sans images, avec rotation des données à 10 jours.
- Sauvegarde Telegram configurée : envoi tous les 10 jours, archive SQLite sans images, refus au-delà de 30 Mo, confirmation Telegram obligatoire.
- Premier envoi Telegram testé : archive de 22,9 Ko contenant uniquement `rwaresto-backup.db`, intégrité SQLite vérifiée.
- Script de vérification HTTP de production ajouté et exécuté avec succès.
- Script `verify-backup.sh` ajouté pour contrôler l'intégrité des archives sans toucher à la production.
- Menus spéciaux datés ajoutés à l'administration : dates de début/fin, en plus des horaires de service.
- Ajout/modification des plats, prix, photos, disponibilité, masquage et archivage vérifiés dans l'admin.
- Documentation : `docs/EXPLOITATION.md`.

### En cours

- Vérifier une restauration complète dans un environnement sûr.

### Décisions

- Google Drive et rclone sont abandonnés.
- Les images ne sont pas incluses dans les sauvegardes ; elles restent dans `/data/uploads`.
- Si une archive dépasse 30 Mo, elle n'est pas envoyée et une alerte est produite.
- Le paiement en ligne sera traité en dernier.
- Fidélité, notifications, statistiques avancées, multi-langue et créneaux sont reportés.

## Diagnostic OpenCode

- Fournisseur : `opencode-go`
- Modèle : `deepseek-v4.1-flash`
- URL de base : `https://opencode.ai/inference/go/openai/v1`

Les journaux OpenCode montrent des erreurs `Cannot connect to API` entre 18:35 et 19:19 UTC sur une ancienne exécution. La résolution DNS et la connexion TLS vers `opencode.ai` fonctionnent actuellement, et les appels du modèle actuel réussissent. Il s'agissait donc d'une indisponibilité réseau/fournisseur temporaire, pas d'un problème de l'application Rwaresto.

## Tâches restantes

### Haute priorité

1. Tester une restauration réelle dans un environnement sûr.
2. Vérifier le prochain envoi Telegram automatique après 10 jours.
3. Valider les procédures de sauvegarde et de restauration.

### Priorité moyenne

4. Remplacer les visuels provisoires par de vraies photos.
5. Remplacer les prix/descriptions provisoires par la carte définitive.
6. Imprimer et vérifier les QR codes des tables.
7. Faire un audit final mobile, tablette, desktop, mode sombre et accessibilité (le script HTTP est déjà en place).

### Plus tard

8. Fidélité.
9. Notifications.
10. Statistiques avancées.
11. Multi-langue.
12. Précommande de créneaux.
13. Paiement en ligne, en dernier.

## Points de vigilance

- Les archives de configuration contiennent `.env` : ne jamais les publier.
- Les images ne sont pas sauvegardées. Une perte totale du VPS nécessiterait de les recréer.
- Les anciennes archives locales peuvent encore contenir des images jusqu'à leur rotation à 10 jours.
- Le bot Telegram et son token ne doivent jamais être commités.
- Ne jamais supprimer le volume `rwaresto_data` sans sauvegarde.
