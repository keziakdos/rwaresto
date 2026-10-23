-- Le dégué n'est pas marqué végétalien par défaut (recette pouvant contenir du lait).
UPDATE "Product" SET "vegan" = 0 WHERE "slug" = 'degue-mangue';
