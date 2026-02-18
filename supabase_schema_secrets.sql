-- Création de la table pour stocker le token API
CREATE TABLE IF NOT EXISTS api_secrets (
    provider TEXT PRIMARY KEY, -- 'meteo_france'
    access_token TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active la sécurité (seulement le serveur peut écrire)
ALTER TABLE api_secrets ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée au public (pour que le site web puisse récupérer le token)
CREATE POLICY "Lecture publique" ON api_secrets FOR SELECT USING (true);

-- Ecriture réservée au service_role (nos scripts backend)
CREATE POLICY "Ecriture système" ON api_secrets FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Mise à jour système" ON api_secrets FOR UPDATE USING (auth.role() = 'service_role');

-- Insertion initiale (vide, le script le remplira)
INSERT INTO api_secrets (provider, access_token) 
VALUES ('meteo_france', 'EN_ATTENTE') 
ON CONFLICT (provider) DO NOTHING;
