-- ============================================================
-- INDEX OPTIMISÉ POUR FILTRAGE PAR DÉPARTEMENT
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Index sur les 2 premiers caractères du station_id (département)
DROP INDEX IF EXISTS idx_obs_6mn_dept;
CREATE INDEX idx_obs_6mn_dept ON observations_6mn (LEFT(station_id, 2), timestamp DESC);

-- Analyser après création
ANALYZE observations_6mn;
