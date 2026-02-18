-- Optimisation maximale pour le site : Filtre les DOM/TOM (97/98)
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
      AND (
          array_length(dept_codes, 1) IS NULL 
          OR array_length(dept_codes, 1) = 0
          OR LEFT(station_id, 2) = ANY(dept_codes)
      )
      -- EXCLUSION DES POSTES 97 (DOM) ET 98 (COM/TOM)
      AND LEFT(station_id, 2) NOT IN ('97', '98');
$$;

GRANT EXECUTE ON FUNCTION get_daily_extremes_fast(DATE, TEXT[]) TO anon, authenticated;
