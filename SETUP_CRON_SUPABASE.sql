-- ============================================
-- CONFIGURATION AUTOMATIQUE COLLECTE MÉTÉO
-- ============================================
-- Ce script configure la collecte automatique des données Météo-France
-- dans votre base de données Supabase

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Configurer le cron job pour la collecte 6 minutes
-- Exécution toutes les 6 minutes
SELECT cron.schedule(
  'collect-meteo-6mn',
  '*/6 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-6mn',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3. Configurer le cron job pour la collecte horaire
-- Exécution toutes les heures à la 5ème minute
SELECT cron.schedule(
  'collect-meteo-horaire',
  '5 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/collect-horaire',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 4. Vérifier que les cron jobs sont bien créés
SELECT jobid, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
WHERE jobname IN ('collect-meteo-6mn', 'collect-meteo-horaire');

-- 5. Pour voir l'historique d'exécution (après quelques minutes)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
