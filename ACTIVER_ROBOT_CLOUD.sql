-- ==============================================================================
-- 🤖 ACTIVER LE ROBOT AUTOMATIQUE SUR SUPABASE (CRON JOB)
-- ==============================================================================
-- Copiez tout ce code et collez-le dans le "SQL Editor" de votre projet Supabase.
-- Ensuite, cliquez sur "RUN".
-- ==============================================================================

-- 1. Activer les extensions nécessaires (si ce n'est pas déjà fait)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Nettoyer les anciens robots (pour éviter les doublons)
select cron.unschedule('collecte-meteo-auto');

-- 3. CRÉER LE ROBOT (PLANNING)
-- "*/6 * * * *" signifie : Toutes les 6 minutes, tous les jours, tout le temps.
-- Il va appeler votre Edge Function "collect-6mn"
select cron.schedule(
    'collecte-meteo-auto', -- Nom du robot
    '*/6 * * * *',         -- Planning : toutes les 6 minutes
    $$
    select
        net.http_post(
            -- URL de votre fonction (ATTENTION : Remplacez PROJECT_REF par votre ID de projet)
            -- Vous trouvez l'URL exacte dans l'onglet "Edge Functions" de Supabase
            'https://YOUR_PROJECT_REF.supabase.co/functions/v1/collect-6mn',
            
            -- Headers (On dit qu'on envoie du JSON et on donne la clé d'autorisation)
            '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}',
            
            -- Body (Vide pour l'instant)
            '{}'
        ) as request_id;
    $$
);

-- Note : Remplacez 'YOUR_PROJECT_REF' par l'ID de votre projet (ex: 'fpwrglz...')
-- Note : Remplacez 'YOUR_SERVICE_ROLE_KEY' par la clé 'service_role' (celle qui commence par eyJ...)
-- Vous trouvez ces infos dans Project Settings > API.
