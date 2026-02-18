-- ============================================================
-- SQL SETUP : ARCHIVAGE DE LA FOUDRE (AGATE MÉTÉO)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Table pour l'historique des impacts
CREATE TABLE IF NOT EXISTS public.lightning_strikes (
    id BIGSERIAL PRIMARY KEY,
    strike_time TIMESTAMPTZ NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lon DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Empêche les doublons (même seconde, même endroit)
    UNIQUE(strike_time, lat, lon)
);

-- Index pour la performance (recherche par date et zone)
CREATE INDEX IF NOT EXISTS idx_lightning_time ON public.lightning_strikes(strike_time DESC);
CREATE INDEX IF NOT EXISTS idx_lightning_geo ON public.lightning_strikes(lat, lon);

-- 2. Fonction de nettoyage automatique
-- Par défaut : on garde 7 jours (168 heures) pour avoir de la marge,
-- mais vous pourrez ajuster à 72h si vous préférez.
CREATE OR REPLACE FUNCTION public.prune_old_lightning_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.lightning_strikes
    WHERE strike_time < (NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- 3. Ajout du robot de collecte (Toutes les 10 minutes)
-- Il appellera l'Edge Function pour synchroniser Agate -> Supabase
SELECT cron.schedule(
    'collect-foudre-auto',
    '*/10 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/archive-strikes',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- 4. Automatisation du nettoyage (Chaque nuit à 03:00)
SELECT cron.schedule(
    'prune-lightning-history',
    '0 3 * * *',
    'SELECT public.prune_old_lightning_data();'
);

-- 5. Politique de lecture publique (facultatif si vous utilisez service_role)
ALTER TABLE public.lightning_strikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique pour tous" ON public.lightning_strikes FOR SELECT USING (true);
