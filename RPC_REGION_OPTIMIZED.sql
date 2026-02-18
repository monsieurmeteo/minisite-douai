-- ============================================================
-- RPC OPTIMISÉE PAR RÉGION
-- Filtre directement les départements côté serveur
-- ============================================================

DROP FUNCTION IF EXISTS get_daily_extremes_region(DATE, TEXT[]);

CREATE FUNCTION get_daily_extremes_region(
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
        d.station_id,
        MIN(d.t)::NUMERIC AS temp_min,
        MAX(d.t)::NUMERIC AS temp_max,
        MAX(d.ff)::NUMERIC AS wind_mean_max,
        MAX(d.fxi)::NUMERIC AS wind_gust_max,
        SUM(COALESCE(d.rr_per, 0))::NUMERIC AS rain_total
    FROM observations_6mn d
    WHERE d.timestamp >= target_date::TIMESTAMP 
      AND d.timestamp < (target_date + INTERVAL '1 day')::TIMESTAMP
      AND (
          array_length(dept_codes, 1) IS NULL 
          OR array_length(dept_codes, 1) = 0
          OR LEFT(d.station_id, 2) = ANY(dept_codes)
      )
    GROUP BY d.station_id;
$$;

GRANT EXECUTE ON FUNCTION get_daily_extremes_region(DATE, TEXT[]) TO anon, authenticated;

-- Test rapide
-- SELECT COUNT(*) FROM get_daily_extremes_region('2026-01-20', ARRAY['29', '22', '56', '35']);
