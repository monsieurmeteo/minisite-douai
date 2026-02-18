-- ============================================================
-- OPTIMISATION CHARGEMENT SIDEBAR (DEPARTEMENTS)
-- ============================================================

-- 1. Index Composite ESSENTIEL pour les requêtes "Dernière observation par station"
-- Permet à Postgres de scanner uniquement le haut de l'historique pour chaque station
CREATE INDEX IF NOT EXISTS idx_obs_station_time_desc 
ON observations_6mn (station_id, timestamp DESC);

-- 2. Fonction RPC optimisée
-- Récupère uniquement la dernière observation de chaque station d'un département
-- Temps d'exécution attendu: < 50ms (contre 1-2s avant)
CREATE OR REPLACE FUNCTION get_department_latest(dept_code TEXT)
RETURNS TABLE (
    station_id TEXT,
    timestamp TIMESTAMPTZ,
    t REAL,
    wind REAL,
    rain REAL
) AS $$
BEGIN
    -- Gestion Corse (2A/2B -> 20)
    IF dept_code IN ('2A', '2B') THEN
        dept_code := '20';
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (o.station_id)
        o.station_id,
        o.timestamp,
        o.t,
        o.ff, -- Wind speed
        o.rr_per -- Rain
    FROM observations_6mn o
    WHERE o.station_id LIKE dept_code || '%'
    ORDER BY o.station_id, o.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Droits d'accès
GRANT EXECUTE ON FUNCTION get_department_latest(TEXT) TO anon, authenticated;
