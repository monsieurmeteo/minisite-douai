-- Ajouter la colonne visibilité (vv) à la table observations_6mn si elle n'existe pas
-- La visibilité est en mètres dans l'API Météo-France

-- Ajouter la colonne vv (visibilité en mètres)
ALTER TABLE observations_6mn ADD COLUMN IF NOT EXISTS vv INTEGER;

-- Créer un index pour les requêtes sur la visibilité
CREATE INDEX IF NOT EXISTS idx_observations_6mn_vv ON observations_6mn(vv) WHERE vv IS NOT NULL;

-- Commentaire explicatif
COMMENT ON COLUMN observations_6mn.vv IS 'Visibilité horizontale en mètres (paramètre vv de Météo-France)';

-- Vérification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'observations_6mn' 
ORDER BY ordinal_position;
