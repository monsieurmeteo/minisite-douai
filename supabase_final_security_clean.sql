
-- ==============================================================================
-- 🔒 CORRECTION FINALE DES ALERTES DE SÉCURITÉ SUPABASE
-- ==============================================================================

-- 1. Note sur pg_net : L'extension pg_net ne supporte pas le changement de schéma via ALTER.
-- Pour la déplacer, il faudrait la supprimer et la recréer, ce qui risquerait de casser vos collectes actives.
-- Comme c'est un avertissement (WARN) et non une erreur (ERROR), nous la laissons ainsi pour privilégier la stabilité.

-- 2. Sécurisation de la table 'observations_validation'
-- Actuellement n'importe qui peut valider une observation
ALTER TABLE public.observations_validation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permettre validation publique" ON public.observations_validation;
CREATE POLICY "Public read validation" ON public.observations_validation FOR SELECT USING (true);
-- Seul le service_role (le serveur) peut enregistrer une validation
CREATE POLICY "Service role write validation" ON public.observations_validation FOR INSERT TO service_role WITH CHECK (true);


-- 3. Sécurisation de la table 'vigilance_bulletins'
ALTER TABLE public.vigilance_bulletins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert bulletins" ON public.vigilance_bulletins;
DROP POLICY IF EXISTS "Public update bulletins" ON public.vigilance_bulletins;
DROP POLICY IF EXISTS "Public read bulletins" ON public.vigilance_bulletins;
DROP POLICY IF EXISTS "Service role write bulletins" ON public.vigilance_bulletins;

CREATE POLICY "Public read bulletins" ON public.vigilance_bulletins FOR SELECT USING (true);
CREATE POLICY "Service role write bulletins" ON public.vigilance_bulletins FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 4. Nettoyage final pour 'vigilance_status' (si pas encore fait)
ALTER TABLE public.vigilance_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Public update vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Public read vigilance" ON public.vigilance_status;
DROP POLICY IF EXISTS "Service role write vigilance" ON public.vigilance_status;

CREATE POLICY "Public read vigilance" ON public.vigilance_status FOR SELECT USING (true);
CREATE POLICY "Service role write vigilance" ON public.vigilance_status FOR ALL TO service_role USING (true) WITH CHECK (true);
