-- CORRECTION : Suppression totale pour recréation propre
-- Pour être sûr qu'il n'y a pas de conflit de signature
DROP FUNCTION IF EXISTS get_suspicious_observations(INT);

CREATE OR REPLACE FUNCTION get_suspicious_observations(
    lookback_hours INT DEFAULT 24
)
RETURNS TABLE (
    id BIGINT,
    station_id TEXT,
    obs_time TIMESTAMPTZ,
    param_name TEXT,
    value NUMERIC,
    threshold_msg TEXT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (lookback_hours || ' hours')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.station_id::TEXT, 
        o.timestamp,
        (CASE 
            WHEN (o.t > 40 OR o.t < -20) THEN 'temp'
            WHEN (o.fxi > 130) THEN 'wind'
            WHEN (o.rr_per > 30) THEN 'rain'
            ELSE 'unknown'
        END)::TEXT,
        (CASE 
            WHEN (o.t > 40 OR o.t < -20) THEN o.t
            WHEN (o.fxi > 130) THEN o.fxi
            WHEN (o.rr_per > 30) THEN o.rr_per
            ELSE 0
        END)::NUMERIC,
        (CASE 
            WHEN o.t > 40 THEN 'Température > 40°C'
            WHEN o.t < -20 THEN 'Température < -20°C'
            WHEN o.fxi > 130 THEN 'Rafale > 130 km/h'
            WHEN o.rr_per > 30 THEN 'Pluie > 30mm/6mn'
            ELSE 'Autre'
        END)::TEXT
    FROM observations_6mn o
    WHERE o.timestamp > start_time
      AND (
          (o.t > 40 OR o.t < -20) OR
          (o.fxi > 130) OR
          (o.rr_per > 30)
      )
      AND NOT EXISTS (
          SELECT 1 FROM observations_validation v 
          WHERE v.observation_id = o.id
      )
    ORDER BY o.timestamp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
