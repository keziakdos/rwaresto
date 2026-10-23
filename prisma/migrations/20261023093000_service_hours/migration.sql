-- Nouveaux horaires : 09h00 – 01h00 (fermeture le lendemain).
UPDATE "Setting" SET "value" = '09:00' WHERE "key" = 'openTime';
UPDATE "Setting" SET "value" = '01:00' WHERE "key" = 'closeTime';
UPDATE "Setting" SET "value" = 'Tous les jours · 09h00 – 01h00' WHERE "key" = 'hoursText';
