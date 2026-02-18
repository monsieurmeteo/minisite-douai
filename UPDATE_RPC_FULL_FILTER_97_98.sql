-- 1. On supprime l'ancienne version
DROP FUNCTION IF EXISTS get_daily_extremes_full(DATE);

-- 2. On recrée la version avec exclusion 97/98
CREATE OR REPLACE FUNCTION get_daily_extremes_full(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(JSON_AGG(t), '[]'::JSON) INTO result
  FROM (
    SELECT
        d.station_id,
        MIN(d.t)::NUMERIC AS temp_min,
        MAX(d.t)::NUMERIC AS temp_max,
        MAX(d.ff)::NUMERIC AS wind_mean_max,
        MAX(d.fxi)::NUMERIC AS wind_gust_max,
        MAX(d.timestamp) AS wind_gust_time,
        SUM(COALESCE(d.rr_per, 0))::NUMERIC AS rain_total
    FROM observations_6mn d
    WHERE d.timestamp >= target_date::TIMESTAMP
      AND d.timestamp < (target_date + INTERVAL '1 day')::TIMESTAMP
      -- EXCLUSION DES POSTES 97/98
      AND LEFT(d.station_id, 2) NOT IN ('97', '98')
    GROUP BY d.station_id
  ) t;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_extremes_full(DATE) TO anon, authenticated;
