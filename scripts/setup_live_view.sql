-- ============================================================
-- OBSERVATIONS EN DIRECT (FRANCE ENTIÈRE)
-- ============================================================

-- Fonction optimisée pour tirer l'état INSTANTANÉ de tout le réseau
-- Utilise l'index créé précédemment (station_id, timestamp DESC)
CREATE OR REPLACE FUNCTION get_france_live()
RETURNS TABLE (
    station_id TEXT,
    obs_time TIMESTAMPTZ,
    t REAL,
    wind REAL,
    gust REAL,
    rain REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (o.station_id)
        o.station_id,
        o.timestamp,
        o.t,
        o.ff,
        o.fxi,
        o.rr_per
    FROM observations_6mn o
    -- On ne regarde que les 2 dernières heures pour limiter le scan
    -- (Si une station n'a rien envoyé depuis 2h, elle est considérée HS/Inactive)
    WHERE o.timestamp > (NOW() - INTERVAL '2 hours')
    ORDER BY o.station_id, o.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_france_live() TO anon, authenticated;
