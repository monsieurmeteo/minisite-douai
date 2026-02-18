-- ==============================================================================
-- 📊 FONCTION RPC : Récupération des observations à un instant T
-- ==============================================================================
-- Cette fonction récupère les observations météo les plus proches d'un instant donné
-- pour toutes les stations, avec une tolérance de +/- 10 minutes

CREATE OR REPLACE FUNCTION get_instant_observations(
    target_datetime TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    station_id TEXT,
    observation_time TIMESTAMP WITH TIME ZONE,
    temperature NUMERIC,
    wind_speed NUMERIC,
    wind_gust NUMERIC,
    precipitation NUMERIC,
    humidity NUMERIC,
    pressure NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_obs AS (
        SELECT 
            o.station_id,
            o.observation_time,
            o.temperature,
            o.wind_speed,
            o.wind_gust,
            o.precipitation,
            o.humidity,
            o.pressure,
            ABS(EXTRACT(EPOCH FROM (o.observation_time - target_datetime))) as time_diff_seconds,
            ROW_NUMBER() OVER (
                PARTITION BY o.station_id 
                ORDER BY ABS(EXTRACT(EPOCH FROM (o.observation_time - target_datetime)))
            ) as rn
        FROM observations o
        WHERE o.observation_time BETWEEN (target_datetime - INTERVAL '10 minutes') 
                                     AND (target_datetime + INTERVAL '10 minutes')
    )
    SELECT 
        r.station_id,
        r.observation_time,
        r.temperature,
        r.wind_speed,
        r.wind_gust,
        r.precipitation,
        r.humidity,
        r.pressure
    FROM ranked_obs r
    WHERE r.rn = 1  -- Prend l'observation la plus proche pour chaque station
    ORDER BY r.station_id;
END;
$$;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION get_instant_observations(TIMESTAMP WITH TIME ZONE) TO anon, authenticated;

-- ==============================================================================
-- 📝 COMMENTAIRE
-- ==============================================================================
-- Usage exemple:
-- SELECT * FROM get_instant_observations('2026-01-20 14:00:00+01');
-- 
-- Cette fonction :
-- 1. Cherche les observations dans une fenêtre de +/- 10 minutes autour de l'instant demandé
-- 2. Pour chaque station, sélectionne l'observation la plus proche dans le temps
-- 3. Retourne les valeurs instantanées (température, vent, précipitations, etc.)
