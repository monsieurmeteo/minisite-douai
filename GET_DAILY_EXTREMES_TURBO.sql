-- Optimisation maximale pour le générateur de cartes
CREATE OR REPLACE FUNCTION get_daily_extremes_turbo(target_date DATE)
RETURNS TABLE (
    station_id TEXT,
    temp_min NUMERIC,
    temp_max NUMERIC,
    wind_mean_max NUMERIC,
    wind_gust_max NUMERIC,
    rain_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.station_id,
        MIN(d.t)::NUMERIC,
        MAX(d.t)::NUMERIC,
        MAX(d.ff)::NUMERIC,
        MAX(d.fxi)::NUMERIC,
        SUM(COALESCE(d.rr_per, 0))::NUMERIC
    FROM observations_6mn d
    WHERE d.timestamp >= target_date::TIMESTAMP 
      AND d.timestamp < (target_date + INTERVAL '1 day')::TIMESTAMP
    GROUP BY d.station_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_daily_extremes_turbo(DATE) TO anon, authenticated;
