-- Fermeture hebdomadaire le lundi (0 = dimanche, 1 = lundi).
UPDATE "Setting" SET "value" = '1' WHERE "key" = 'closedDays';
UPDATE "Setting" SET "value" = 'Du mardi au dimanche · 09h00 – 01h00' WHERE "key" = 'hoursText';
