
-- ==============================================================================
-- 🔒 CORRECTION DES ALERTES DE SÉCURITÉ SUPABASE
-- ==============================================================================

-- 1. Correction pour 'station_climatology' (RLS Désactivé)
ALTER TABLE public.station_climatology ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture publique pour tout le monde
CREATE POLICY "Allow public read access on station_climatology" 
ON public.station_climatology FOR SELECT USING (true);


-- 2. Correction pour 'lightning_strikes' (RLS Désactivé)
ALTER TABLE public.lightning_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on lightning_strikes" 
ON public.lightning_strikes FOR SELECT USING (true);


-- 3. Correction pour 'radar_history' (RLS Désactivé)
ALTER TABLE public.radar_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on radar_history" 
ON public.radar_history FOR SELECT USING (true);


-- 4. Correction pour 'national_extremes_day' (Security Definer View)
-- Supabase recommande d'utiliser SECURITY INVOKER pour que la vue respecte le RLS de l'utilisateur
-- On change le paramètre de la vue existante
ALTER VIEW public.national_extremes_day SET (security_invoker = on);

-- Note: Si la commande ALTER VIEW échoue selon votre version de Postgres, 
-- il faut recréer la vue sans le mot clé 'SECURITY DEFINER'.
