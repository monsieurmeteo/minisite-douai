-- ============================================
-- CORRECTIF FINAL AUTOMATISATION (V3)
-- ============================================
-- Ce script utilise la clé ANON en dur pour garantir l'appel,
-- car la fonction gère elle-même sa sécurité interne.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Supprimer les anciens jobs s'ils existent pour éviter les doublons
SELECT cron.unschedule('collect-meteo-6mn');
SELECT cron.unschedule('collect-meteo-horaire');

-- 1. Collecte 6 minutes (toutes les 6 minutes)
SELECT cron.schedule(
  'collect-meteo-6mn',
  '*/6 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2. Collecte horaire (toutes les heures à H:05)
SELECT cron.schedule(
  'collect-meteo-horaire',
  '5 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-horaire',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_1qhA0xAnNSd3VxpoLdxYrQ_yUemEhaP"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3. Vérification immédiate
SELECT jobid, jobname, command, active FROM cron.job;
