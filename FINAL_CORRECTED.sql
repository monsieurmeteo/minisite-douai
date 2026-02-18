-- ==============================================================================
-- 🚀 CORRECTION FINALE : ACTIVATION AVEC LA BONNE CLÉ
-- ==============================================================================

-- 1. Nettoyage de l'essai précédent (pour remettre le bon)
DO $$
BEGIN
    PERFORM cron.unschedule('collecte-meteo-auto');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. CRÉATION DU PLANNING AVEC VOTRE VRAIE CLÉ
-- (J'ai inséré la clé que vous m'avez donnée : eyJhbGc...)

select cron.schedule(
    'collecte-meteo-auto',
    '*/6 * * * *',
    $$
    select
        net.http_post(
            'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn',
            jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI'
            ),
            '{}'::jsonb
        ) as request_id;
    $$
);
