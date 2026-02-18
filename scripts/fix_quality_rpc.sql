-- Optimisation de get_suspicious_observations pour éviter le timeout
-- On utilise un index (ou on espère qu'il existe) sur timestamp
-- Et on simplifie la requête pour la rendre plus rapide

CREATE OR REPLACE FUNCTION get_suspicious_observations(
    lookback_hours INT DEFAULT 24
)
RETURNS TABLE (
    id BIGINT,
    station_id TEXT,
    timestamp TIMESTAMPTZ,
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
        o.station_id,
        o.timestamp,
        CASE 
            WHEN o.t > 40 OR o.t < -20 THEN 'temp'
            WHEN o.fxi > 130 THEN 'wind'
            WHEN o.rr_per > 30 THEN 'rain'
            ELSE 'unknown'
        END as param_name,
        CASE 
            WHEN o.t > 40 OR o.t < -20 THEN o.t
            WHEN o.fxi > 130 THEN o.fxi
            WHEN o.rr_per > 30 THEN o.rr_per
            ELSE 0::numeric
        END as value,
        CASE 
            WHEN o.t > 40 THEN 'Température > 40°C'
            WHEN o.t < -20 THEN 'Température < -20°C'
            WHEN o.fxi > 130 THEN 'Rafale > 130 km/h'
            WHEN o.rr_per > 30 THEN 'Pluie > 30mm/6mn'
            ELSE 'Autre'
        END as threshold_msg
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

-- S'assurer que l'index existe sur timestamp pour la rapidité
CREATE INDEX IF NOT EXISTS idx_observations_6mn_timestamp ON observations_6mn(timestamp DESC);
