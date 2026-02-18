-- ============================================================
-- CORRECTIF : RAJOUT DE L'HEURE DES RAFALES (HXI) 
-- DANS LES RÉSUMÉS ET LA FONCTION RAPIDE
-- ============================================================

-- 1. Rajouter la colonne si elle n'existe pas dans daily_summaries
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS wind_gust_time TIMESTAMPTZ;

-- 2. Mettre à jour la fonction de rafraîchissement pour calculer l'heure exacte
CREATE OR REPLACE FUNCTION refresh_daily_summaries(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    count_updated INTEGER;
BEGIN
    INSERT INTO daily_summaries (date, station_id, temp_min, temp_max, wind_mean_max, wind_gust_max, wind_gust_time, rain_total, updated_at)
    SELECT 
        target_date,
        station_id,
        MIN(t),
        MAX(t),
        MAX(ff),
        MAX(fxi),
        -- Calcul de l'heure de la rafale MAX (plus précis)
        (ARRAY_AGG(timestamp ORDER BY fxi DESC, timestamp DESC))[1],
        SUM(COALESCE(rr_per, 0)),
        NOW()
    FROM observations_6mn
    WHERE timestamp >= target_date::TIMESTAMP 
      AND timestamp < (target_date + INTERVAL '1 day')::TIMESTAMP
      AND station_id NOT LIKE 'SIMULATION%'
    GROUP BY station_id
    ON CONFLICT (date, station_id) DO UPDATE SET
        temp_min = LEAST(daily_summaries.temp_min, EXCLUDED.temp_min),
        temp_max = GREATEST(daily_summaries.temp_max, EXCLUDED.temp_max),
        wind_mean_max = GREATEST(daily_summaries.wind_mean_max, EXCLUDED.wind_mean_max),
        wind_gust_max = GREATEST(daily_summaries.wind_gust_max, EXCLUDED.wind_gust_max),
        -- On met à jour l'heure uniquement si la rafale est supérieure ou égale à l'ancienne
        wind_gust_time = CASE 
            WHEN EXCLUDED.wind_gust_max >= daily_summaries.wind_gust_max THEN EXCLUDED.wind_gust_time 
            ELSE daily_summaries.wind_gust_time 
        END,
        rain_total = EXCLUDED.rain_total,
        updated_at = NOW();
    
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    RETURN count_updated;
END;
$$;

-- 3. Mettre à jour get_daily_extremes_fast pour retourner la colonne
DROP FUNCTION IF EXISTS get_daily_extremes_fast(DATE, TEXT[]);

CREATE OR REPLACE FUNCTION get_daily_extremes_fast(
    target_date DATE DEFAULT CURRENT_DATE,
    dept_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
    station_id TEXT,
    temp_min NUMERIC,
    temp_max NUMERIC,
    wind_mean_max NUMERIC,
    wind_gust_max NUMERIC,
    wind_gust_time TIMESTAMPTZ,
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
        wind_gust_time,
        rain_total
    FROM daily_summaries
    WHERE date = target_date
      AND (
          array_length(dept_codes, 1) IS NULL 
          OR array_length(dept_codes, 1) = 0
          OR LEFT(station_id, 2) = ANY(dept_codes)
      );
$$;

-- 4. Droits
GRANT EXECUTE ON FUNCTION get_daily_extremes_fast(DATE, TEXT[]) TO anon, authenticated;

-- 5. Lancer un rafraîchissement pour aujourd'hui pour peupler les données
SELECT refresh_daily_summaries(CURRENT_DATE);
