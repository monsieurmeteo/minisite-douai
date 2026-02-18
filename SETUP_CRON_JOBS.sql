-- ============================================================
-- CONFIGURATION CRON JOBS SUPABASE
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================
-- Supprimer les anciens crons s'ils existent
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-6mn-auto') THEN
        PERFORM cron.unschedule('collect-6mn-auto');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-horaire-auto') THEN
        PERFORM cron.unschedule('collect-horaire-auto');
    END IF;
END $$;

-- ==========================================
-- CRON 1: Collecte 6 minutes (toutes les 6 min)
-- ==========================================
SELECT cron.schedule(
    'collect-6mn-auto',
    '*/6 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn',
        headers := '{"Authorization": "Bearer sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- ==========================================
-- CRON 2: Collecte horaire (toutes les heures à H:10)
-- ==========================================
SELECT cron.schedule(
    'collect-horaire-auto',
    '10 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-horaire',
        headers := '{"Authorization": "Bearer sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- ==========================================
-- VÉRIFICATION: Afficher les crons actifs
-- ==========================================
SELECT jobname, schedule, active FROM cron.job;
