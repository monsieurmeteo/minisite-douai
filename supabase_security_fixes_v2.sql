
-- ==============================================================================
-- 🔒 CORRECTION DES ALERTES DE SÉCURITÉ SUPABASE (BATCH 2)
-- ==============================================================================

-- 1. Sécurisation du Search Path pour les fonctions (Anti-Injection)
-- Cela force les fonctions à regarder uniquement dans 'public'
ALTER FUNCTION public.prune_old_lightning_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.prune_old_radar_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_supervision_records() SET search_path = public, pg_temp;
ALTER FUNCTION public.manage_observation(bigint, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_suspicious_observations(int) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_department_latest(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_france_live() SET search_path = public, pg_temp;


-- 2. Déplacement des extensions vers un schéma dédié (Optionnel mais recommandé)
-- Note: pg_net est souvent requis en public par certaines fonctions, 
-- mais voici la commande si vous avez créé le schéma 'extensions'
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_net SET SCHEMA extensions;


-- 3. Restriction des politiques RLS trop permissives (Write Access)
-- On remplace les accès "public" par des accès réservés au "service_role" (le serveur)
-- pour éviter que n'importe qui puisse modifier vos données via l'API.

-- Table btp_projects
DROP POLICY IF EXISTS "Allow public read/write for btp_projects" ON public.btp_projects;
DROP POLICY IF EXISTS "Allow public read for btp_projects" ON public.btp_projects;
DROP POLICY IF EXISTS "Allow service_role write for btp_projects" ON public.btp_projects;
CREATE POLICY "Allow public read for btp_projects" ON public.btp_projects FOR SELECT USING (true);
CREATE POLICY "Allow service_role write for btp_projects" ON public.btp_projects FOR ALL 
TO service_role USING (true) WITH CHECK (true);

-- Table normales_climatologiques
DROP POLICY IF EXISTS "Enable insert for service role" ON public.normales_climatologiques;
DROP POLICY IF EXISTS "Enable update for service role" ON public.normales_climatologiques;
DROP POLICY IF EXISTS "Service role insert" ON public.normales_climatologiques;
DROP POLICY IF EXISTS "Service role update" ON public.normales_climatologiques;
CREATE POLICY "Service role insert" ON public.normales_climatologiques FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update" ON public.normales_climatologiques FOR UPDATE TO service_role USING (true);

-- Table vigilance_status / bulletins
ALTER TABLE public.vigilance_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Public update vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Public read vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Service role write vigilance" ON public.vigilance_status;
CREATE POLICY "Public read vigilance" ON public.vigilance_status FOR SELECT USING (true);
CREATE POLICY "Service role write vigilance" ON public.vigilance_status FOR ALL TO service_role USING (true);

-- Table web_links
ALTER TABLE public.web_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert links" ON public.web_links;
DROP POLICY IF EXISTS "Public update links" ON public.web_links;
DROP POLICY IF EXISTS "Public delete links" ON public.web_links;
DROP POLICY IF EXISTS "Public read links" ON public.web_links;
DROP POLICY IF EXISTS "Service role write links" ON public.web_links;
CREATE POLICY "Public read links" ON public.web_links FOR SELECT USING (true);
CREATE POLICY "Service role write links" ON public.web_links FOR ALL TO service_role USING (true);

-- Table user_station_configs
ALTER TABLE public.user_station_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public upsert for configs" ON public.user_station_configs;
DROP POLICY IF EXISTS "Allow individual read" ON public.user_station_configs;
DROP POLICY IF EXISTS "Service role write configs" ON public.user_station_configs;
CREATE POLICY "Allow individual read" ON public.user_station_configs FOR SELECT USING (true);
CREATE POLICY "Service role write configs" ON public.user_station_configs FOR ALL TO service_role USING (true);
