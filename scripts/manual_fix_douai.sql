-- ============================================================
-- SCRIPT DE CORRECTION MANUELLE IMMÉDIATE (DOUAI)
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Forcer la suppression du résumé corrompu pour Douai ce jour (15°C / 150 km/h)
DELETE FROM daily_summaries 
WHERE station_id = '59178001' 
  AND date = '2026-01-21';

-- 2. Recalculer le résumé propre à partir des observations (qui sont nettoyées)
SELECT refresh_daily_summaries('2026-01-21');

-- 3. Vérifier le résultat
SELECT * FROM daily_summaries 
WHERE station_id = '59178001' 
  AND date = '2026-01-21';
