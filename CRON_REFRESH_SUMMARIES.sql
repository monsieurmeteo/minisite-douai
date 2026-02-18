-- ============================================================
-- CRON POUR MAINTENIR LES RÉSUMÉS À JOUR
-- À exécuter APRÈS DAILY_SUMMARIES_SOLUTION.sql
-- ============================================================

-- Supprimer l'ancien cron s'il existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-daily-summaries') THEN
        PERFORM cron.unschedule('refresh-daily-summaries');
    END IF;
END $$;

-- CRON: Rafraîchir les résumés toutes les heures
SELECT cron.schedule(
    'refresh-daily-summaries',
    '0 * * * *',  -- Chaque heure à :00
    $$
    SELECT refresh_daily_summaries(CURRENT_DATE);
    $$
);

-- Vérifier
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'refresh-daily-summaries';
