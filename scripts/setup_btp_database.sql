-- Table pour les configurations de projets BTP
CREATE TABLE IF NOT EXISTS btp_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_header TEXT,
    client_header TEXT,
    client_email TEXT,
    station_id TEXT, -- ID de la station Météo-France liée
    station_name TEXT, -- Nom affiché de la station
    logo_left TEXT, -- Stockage base64 ou URL
    logo_right TEXT, -- Stockage base64 ou URL
    trades_full JSONB DEFAULT '[]',
    active_trades JSONB DEFAULT '[]',
    rules JSONB DEFAULT '[]',
    annex_cols JSONB DEFAULT '{"temp": true, "rain": true, "snow": true, "windA": true, "windG": true, "humi": true, "soil": true, "windAvgPdf": false}',
    display_simple BOOLEAN DEFAULT false,
    show_charts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour accélérer les recherches par nom
CREATE INDEX IF NOT EXISTS idx_btp_projects_name ON btp_projects(name);

-- Politique RLS (pour l'instant ouverte si pas d'auth forcée, à adapter selon le projet)
ALTER TABLE btp_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write for btp_projects" ON btp_projects FOR ALL USING (true) WITH CHECK (true);
