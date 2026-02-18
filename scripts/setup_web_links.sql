-- ============================================================
-- TABLE DES LIENS WEB (WEB LINKS MANAGER)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.web_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    titre TEXT,
    description TEXT NOT NULL,
    date_ajout TIMESTAMPTZ DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE
);

-- Activation de RLS
ALTER TABLE public.web_links ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès (Ouvert pour le prototype admin)
DROP POLICY IF EXISTS "Public read links" ON public.web_links;
CREATE POLICY "Public read links" ON public.web_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert links" ON public.web_links;
CREATE POLICY "Public insert links" ON public.web_links FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update links" ON public.web_links;
CREATE POLICY "Public update links" ON public.web_links FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete links" ON public.web_links;
CREATE POLICY "Public delete links" ON public.web_links FOR DELETE USING (true);
