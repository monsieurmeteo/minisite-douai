-- ==============================================================================
-- 🚀 ACTIVATION DEFINITIVE DU ROBOT (VERSION CORRIGÉE)
-- ==============================================================================

-- 1. On s'assure que le module de planning est activé
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. On supprime l'ancien S'IL EXISTE (avec une sécurité pour ne pas planter)
-- Cette technique évite l'erreur "could not find valid entry"
DO $$
BEGIN
    PERFORM cron.unschedule('collecte-meteo-auto');
EXCEPTION WHEN OTHERS THEN
    -- Si ça plante (parce qu'il n'existe pas), on ne fait rien et on continue !
    NULL;
END $$;

-- 3. ON CRÉE LE PLANNING
-- RAPPEL : Remplacez "COLLEZ_VOTRE_CLE_SERVICE_ROLE_ICI" par votre vraie clé !

select cron.schedule(
    'collecte-meteo-auto',      -- Nom du job
    '*/6 * * * *',              -- Toutes les 6 mns
    $$
    select
        net.http_post(
            -- L'URL est déjà la bonne pour votre projet
            'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn',
            
            -- Les Headers avec la clé d'autorisation
            jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer COLLEZ_VOTRE_CLE_SERVICE_ROLE_ICI'
            ),
            
            -- Le corps (body) vide
            '{}'::jsonb
        ) as request_id;
    $$
);
