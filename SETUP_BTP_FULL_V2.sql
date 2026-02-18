-- Script complet pour la table BTP Projects (Supabase)
-- Exécutez ce script dans l'éditeur SQL de Supabase pour mettre à jour la base de données.

CREATE TABLE IF NOT EXISTS btp_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Activation RLS
ALTER TABLE btp_projects ENABLE ROW LEVEL SECURITY;

-- Politiques (Si Auth est utilisé)
DROP POLICY IF EXISTS "Users can manage their own projects" ON btp_projects;
CREATE POLICY "Users can manage their own projects" ON btp_projects
    FOR ALL USING (auth.uid() = user_id);

-- Ajout des colonnes nécessaires (Idempotent)
DO $$
BEGIN
    -- Info Client / Chantier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'company_header') THEN
        ALTER TABLE btp_projects ADD COLUMN company_header TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'client_header') THEN
        ALTER TABLE btp_projects ADD COLUMN client_header TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'client_email') THEN
        ALTER TABLE btp_projects ADD COLUMN client_email TEXT;
    END IF;
    
    -- Station Météo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'station_id') THEN
        ALTER TABLE btp_projects ADD COLUMN station_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'station_name') THEN
        ALTER TABLE btp_projects ADD COLUMN station_name TEXT;
    END IF;

    -- Logos (Stockés en base64/TEXT pour l'instant)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'logo_left') THEN
        ALTER TABLE btp_projects ADD COLUMN logo_left TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'logo_right') THEN
        ALTER TABLE btp_projects ADD COLUMN logo_right TEXT;
    END IF;

    -- Configuration JSONB
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'trades_full') THEN
        ALTER TABLE btp_projects ADD COLUMN trades_full JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'active_trades') THEN
        ALTER TABLE btp_projects ADD COLUMN active_trades JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'rules') THEN
        ALTER TABLE btp_projects ADD COLUMN rules JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'annex_cols') THEN
        ALTER TABLE btp_projects ADD COLUMN annex_cols JSONB;
    END IF;
    
    -- Options booléennes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'display_simple') THEN
        ALTER TABLE btp_projects ADD COLUMN display_simple BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'show_charts') THEN
        ALTER TABLE btp_projects ADD COLUMN show_charts BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'check_period') THEN
        ALTER TABLE btp_projects ADD COLUMN check_period BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'auto_snow') THEN
        ALTER TABLE btp_projects ADD COLUMN auto_snow BOOLEAN DEFAULT true;
    END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'snow_temp_limit') THEN
        ALTER TABLE btp_projects ADD COLUMN snow_temp_limit FLOAT DEFAULT 0;
    END IF;

    -- Données (Attention à la taille, JSONB c'est bien)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'btp_projects' AND column_name = 'global_data') THEN
        ALTER TABLE btp_projects ADD COLUMN global_data JSONB;
    END IF;

END $$;
