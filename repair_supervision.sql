
-- ==============================================================================
-- 🔧 RÉPARATION ACCÈS SUPERVISION RECORDS
-- ==============================================================================

-- 1. Donner les droits sur la nouvelle fonction au public (anon)
-- Sans cela, l'API ne peut pas appeler la fonction
GRANT EXECUTE ON FUNCTION public.get_supervision_records() TO anon, authenticated;


-- 2. Correction de la jointure (Changement INNER -> LEFT)
-- Si une station n'a pas encore ses records chargés, elle s'affichera quand même au lieu de disparaître
CREATE OR REPLACE FUNCTION public.get_supervision_records()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    dept TEXT,
    temp FLOAT,
    tx_day FLOAT,
    tn_day FLOAT,
    gust_day FLOAT,
    rain_day FLOAT,
    clim JSONB,
    last_obs TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.station_id as id,
        COALESCE(sc.name, l.station_id) as name,
        substring(l.station_id, 1, 2) as dept,
        l.t::FLOAT as temp,
        e.tx_day::FLOAT,
        e.tn_day::FLOAT,
        e.gust_day::FLOAT,
        e.rain_day::FLOAT,
        sc.data as clim,
        l.obs_time as last_obs
    FROM 
        public.get_france_live() l
    LEFT JOIN 
        public.national_extremes_day e ON l.station_id = e.station_id
    LEFT JOIN -- Changé de INNER à LEFT pour ne rien perdre
        public.station_climatology sc ON l.station_id = sc.station_id
    WHERE 
        l.t IS NOT NULL;
END;
$$;


-- 3. Sécurité : S'assurer que 'anon' peut lire les sources de données
ALTER TABLE public.observations_6mn ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access on observations_6mn" ON public.observations_6mn;
CREATE POLICY "Public read access on observations_6mn" ON public.observations_6mn FOR SELECT USING (true);

-- Si 'national_extremes_day' est une vue, on la remet en mode SECURITY DEFINER 
-- pour qu'elle puisse lire les données même si l'utilisateur n'a pas tous les droits RLS
ALTER VIEW public.national_extremes_day SET (security_invoker = off);


-- 4. Droits supplémentaires pour pg_net (si utilisé dans les fonctions)
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO service_role;
