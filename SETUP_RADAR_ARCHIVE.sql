-- ============================================================
-- ARCHIVAGE DE L'HISTORIQUE RADAR (48 HEURES)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Création de la table pour stocker les timestamps du radar
CREATE TABLE IF NOT EXISTS public.radar_history (
    id BIGSERIAL PRIMARY KEY,
    ts_value BIGINT UNIQUE NOT NULL, -- Le timestamp RainViewer
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les recherches par temps
CREATE INDEX IF NOT EXISTS idx_radar_history_ts ON public.radar_history(ts_value DESC);

-- 2. Fonction de nettoyage (pour ne garder que 48h)
CREATE OR REPLACE FUNCTION public.prune_old_radar_data()
RETURNS void AS $$
BEGIN
    -- On supprime tout ce qui a plus de 7 jours (604800 secondes)
    DELETE FROM public.radar_history
    WHERE ts_value < (extract(epoch from now()) - 604800);
END;
$$ LANGUAGE plpgsql;

-- 3. Ajout du robot de capture (Toutes les 5 minutes)
SELECT cron.schedule(
    'collect-radar-auto',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/archive-radar',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- 4. Automatisation du nettoyage (Toutes les heures)
SELECT cron.schedule(
    'prune-radar-history',
    '0 * * * *',
    'SELECT public.prune_old_radar_data();'
);
