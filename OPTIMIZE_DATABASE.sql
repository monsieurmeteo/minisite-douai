-- ============================================================
-- SCRIPT COMPLET : OPTIMISATION BASE DE DONNÉES
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- ==========================================
-- PARTIE 1: OPTIMISATION DES INDEX
-- ==========================================

-- Index pour requêtes par plage de temps
DROP INDEX IF EXISTS idx_obs_6mn_timestamp;
CREATE INDEX idx_obs_6mn_timestamp ON observations_6mn (timestamp DESC);

-- Index composite station + timestamp
DROP INDEX IF EXISTS idx_obs_6mn_station_time;
CREATE INDEX idx_obs_6mn_station_time ON observations_6mn (station_id, timestamp DESC);

-- Index sur table horaire
DROP INDEX IF EXISTS idx_obs_horaire_timestamp;
CREATE INDEX idx_obs_horaire_timestamp ON observations_horaire (timestamp DESC);

-- ==========================================
-- PARTIE 2: SUPPRIMER ET RECRÉER LA FONCTION RPC
-- ==========================================

-- D'abord supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_daily_extremes(DATE);

-- Recréer avec SQL pur (plus rapide)
CREATE FUNCTION get_daily_extremes(target_date DATE DEFAULT CURRENT_DATE)
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
    GROUP BY d.station_id;
$$;

GRANT EXECUTE ON FUNCTION get_daily_extremes(DATE) TO anon, authenticated;

-- ==========================================
-- PARTIE 3: ANALYSER LES TABLES
-- ==========================================

ANALYZE observations_6mn;
ANALYZE observations_horaire;

-- ==========================================
-- VÉRIFICATION: Tester la fonction
-- ==========================================
-- SELECT COUNT(*) FROM get_daily_extremes('2026-01-20');
