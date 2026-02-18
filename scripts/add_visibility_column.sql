-- Ajout de la colonne visibilité (vv) aux tables d'observations
ALTER TABLE observations_horaire ADD COLUMN IF NOT EXISTS vv NUMERIC;
ALTER TABLE observations_6mn ADD COLUMN IF NOT EXISTS vv NUMERIC;

-- Commentaire pour expliquer l'unité (mètres)
COMMENT ON COLUMN observations_horaire.vv IS 'Visibilité horizontale en mètres';
COMMENT ON COLUMN observations_6mn.vv IS 'Visibilité horizontale en mètres';
