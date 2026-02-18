-- Table pour stocker les références des bilans foudre quotidiens
-- Exécuter ce SQL dans Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.foudre_bilans (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    image_url TEXT NOT NULL,
    impact_count INTEGER DEFAULT 0,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par date
CREATE INDEX IF NOT EXISTS idx_foudre_bilans_date ON public.foudre_bilans(date DESC);

-- Activer RLS avec lecture publique
ALTER TABLE public.foudre_bilans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique foudre_bilans" ON public.foudre_bilans;
CREATE POLICY "Lecture publique foudre_bilans" 
    ON public.foudre_bilans FOR SELECT USING (true);

-- Permettre l'insertion/update via service role (pour le script)
DROP POLICY IF EXISTS "Insert service foudre_bilans" ON public.foudre_bilans;
CREATE POLICY "Insert service foudre_bilans" 
    ON public.foudre_bilans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update service foudre_bilans" ON public.foudre_bilans;
CREATE POLICY "Update service foudre_bilans" 
    ON public.foudre_bilans FOR UPDATE USING (true);

-- Créer le bucket Storage pour les images (si pas déjà fait)
-- Note: Ceci doit être fait via l'API ou le Dashboard Supabase
-- INSERT INTO storage.buckets (id, name, public) VALUES ('foudre-bilans', 'foudre-bilans', true);
