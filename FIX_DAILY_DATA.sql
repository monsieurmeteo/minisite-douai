
-- Optimisation pour la vue "Températures 30 Villes" et l'historique
-- 1. Table de cache (si pas déjà existante)
CREATE TABLE IF NOT EXISTS daily_summaries (
    date DATE NOT NULL,
    station_id TEXT NOT NULL,
    temp_min NUMERIC,
    temp_max NUMERIC,
    wind_mean_max NUMERIC,
    wind_gust_max NUMERIC,
    rain_total NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (date, station_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries (date);

-- 2. Fonction de rafraîchissement (recalcul depuis brut)
CREATE OR REPLACE FUNCTION refresh_daily_summaries(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    count_updated INTEGER;
BEGIN
    INSERT INTO daily_summaries (date, station_id, temp_min, temp_max, wind_mean_max, wind_gust_max, rain_total, updated_at)
    SELECT 
        target_date,
        station_id,
        MIN(t),
        MAX(t),
        MAX(ff),
        MAX(fxi),
        SUM(COALESCE(rr_per, 0)),
        NOW()
    FROM observations_6mn
    WHERE timestamp >= target_date::TIMESTAMP 
      AND timestamp < (target_date + INTERVAL '1 day')::TIMESTAMP
      AND station_id NOT LIKE 'SIMULATION%'
    GROUP BY station_id
    ON CONFLICT (date, station_id) DO UPDATE SET
        temp_min = EXCLUDED.temp_min,
        temp_max = EXCLUDED.temp_max,
        wind_mean_max = EXCLUDED.wind_mean_max,
        wind_gust_max = EXCLUDED.wind_gust_max,
        rain_total = EXCLUDED.rain_total,
        updated_at = NOW();
    
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    RETURN count_updated;
END;
$$;

-- 3. Fonction de lecture optimisée avec filtre optionnel sur IDs
CREATE OR REPLACE FUNCTION get_daily_summaries(
    target_date DATE,
    station_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    station_id TEXT,
    temp_min NUMERIC,
    temp_max NUMERIC,
    wind_mean_max NUMERIC,
    wind_gust_max NUMERIC,
    rain_total NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        station_id,
        temp_min,
        temp_max,
        wind_mean_max,
        wind_gust_max,
        rain_total
    FROM daily_summaries
    WHERE date = target_date
      AND (station_ids IS NULL OR station_id = ANY(station_ids));
$$;

GRANT EXECUTE ON FUNCTION refresh_daily_summaries(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_summaries(DATE, TEXT[]) TO anon, authenticated;
GRANT SELECT ON daily_summaries TO anon, authenticated;
