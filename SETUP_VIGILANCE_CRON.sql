-- ============================================================
-- AUTOMATISATION DE LA VIGILANCE (TOUTES LES 15 MINUTES)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Nettoyer l'ancienne tâche si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-vigilance-auto') THEN
        PERFORM cron.unschedule('collect-vigilance-auto');
    END IF;
END $$;

-- 2. Créer la tâche CRON
-- Propose un intervalle de 15 minutes (suffisant pour la vigilance)
SELECT cron.schedule(
    'collect-vigilance-auto',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-vigilance',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- Note : Assurez-vous d'avoir déployé la fonction 'collect-vigilance' 
-- et d'avoir configuré le secret METEO_VIGILANCE_TOKEN dans Supabase.
