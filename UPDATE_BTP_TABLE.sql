
-- Mise à jour de la table btp_projects pour stocker plus de données
-- Ces colonnes permettent de sauvegarder l'état complet d'un projet BTP

ALTER TABLE btp_projects ADD COLUMN IF NOT EXISTS global_data JSONB;
ALTER TABLE btp_projects ADD COLUMN IF NOT EXISTS auto_snow BOOLEAN DEFAULT true;
ALTER TABLE btp_projects ADD COLUMN IF NOT EXISTS snow_temp_limit FLOAT DEFAULT 0;
ALTER TABLE btp_projects ADD COLUMN IF NOT EXISTS check_period BOOLEAN DEFAULT false;

-- Commentaire pour aider si besoin
COMMENT ON COLUMN btp_projects.global_data IS 'Stockage des données météorologiques analysées (JSON)';
COMMENT ON COLUMN btp_projects.check_period IS 'Indique si la page de synthèse globale doit être affichée';
