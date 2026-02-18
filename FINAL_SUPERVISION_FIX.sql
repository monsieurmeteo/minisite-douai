
-- ==============================================================================
-- 🚀 SOLUTION FINALE : ALIGNEMENT TOTAL SUR L'ONGLET EXTRÊMES
-- ==============================================================================

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
        ds.station_id as id,
        COALESCE(sc.name, ds.station_id) as name,
        substring(ds.station_id, 1, 2) as dept,
        (SELECT t FROM public.observations_6mn WHERE station_id = ds.station_id ORDER BY timestamp DESC LIMIT 1)::FLOAT as temp,
        ds.temp_max::FLOAT as tx_day,
        ds.temp_min::FLOAT as tn_day,
        ds.wind_gust_max::FLOAT as gust_day,
        ds.rain_total::FLOAT as rain_day,
        sc.data as clim,
        ds.updated_at as last_obs
    FROM 
        public.daily_summaries ds
    LEFT JOIN 
        public.station_climatology sc ON ds.station_id = sc.station_id
    WHERE 
        ds.date = CURRENT_DATE
        AND ds.station_id < '96000000'; -- Uniquement métropole pour ce view
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supervision_records() TO anon, authenticated;

-- On force une mise à jour des statistiques pour être sûr que tout le monde est là
SELECT refresh_daily_summaries(CURRENT_DATE);
