
-- ==============================================================================
-- 🔧 CORRECTIF FINAL : TOUTES LES STATIONS DANS LA SUPERVISION
-- ==============================================================================

-- 1. On s'assure que la fonction utilise un LEFT JOIN pour ne pas exclure 
-- les stations qui n'ont pas encore de records pre-calculés.
-- On s'assure aussi de ne pas limiter le nombre de résultats (PostgREST gèrera la pagination).

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
    LEFT JOIN -- Changé de INNER à LEFT pour inclure Douai, Valenciennes, etc.
        public.station_climatology sc ON l.station_id = sc.station_id
    WHERE 
        l.t IS NOT NULL; -- On ne garde que les stations qui émettent en ce moment
END;
$$;

-- 2. On s'assure que get_france_live include bien toutes les stations actives.
-- Augmentons la fenêtre de temps à 4 heures pour être plus large.

CREATE OR REPLACE FUNCTION get_france_live()
RETURNS TABLE (
    station_id TEXT,
    obs_time TIMESTAMPTZ,
    t REAL,
    wind REAL,
    gust REAL,
    rain REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (o.station_id)
        o.station_id,
        o.timestamp,
        o.t,
        o.ff,
        o.fxi,
        o.rr_per
    FROM observations_6mn o
    WHERE o.timestamp > (NOW() - INTERVAL '4 hours') -- Augmenté de 2h à 4h
    ORDER BY o.station_id, o.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Droits d'exécution
GRANT EXECUTE ON FUNCTION get_france_live() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_supervision_records() TO anon, authenticated;

-- 4. Nettoyage et vérification
ANALYZE observations_6mn;
ANALYZE station_climatology;
