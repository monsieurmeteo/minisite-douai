-- Script de création de la table pour les attestations d'intempéries
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS attestations_intemperies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ville TEXT,
    periode_debut DATE,
    periode_fin DATE,
    station TEXT,
    type_document INTEGER, -- 1=Synthèse, 2=Détaillés, 3=Classification
    seuils_json JSONB,
    nb_jours_intemperies INTEGER,
    pdf_url TEXT,
    date_generation TIMESTAMPTZ DEFAULT NOW()
);

-- Activation de la sécurité RLS (Optionnel si accès public requis)
ALTER TABLE attestations_intemperies ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public pour la démo (À restreindre en prod)
DROP POLICY IF EXISTS "Public access" ON attestations_intemperies;
CREATE POLICY "Public access" ON attestations_intemperies
    FOR ALL USING (true) WITH CHECK (true);
