
-- ==============================================================================
-- 🕋 SETUP CLIMATOLOGIE AUTOMATIQUE (4H00 DU MATIN)
-- ==============================================================================

-- 1. Table pour stocker les records et normales de chaque station
CREATE TABLE IF NOT EXISTS public.station_climatology (
    station_id TEXT PRIMARY KEY,
    name TEXT,
    data JSONB, -- Contient normales (tx, tn, pr, sun) et records (maxWind, etc.)
    last_update TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fonction RPC pour récupérer la supervision complète (LIVE + CLIM) en un seul appel
-- Cela évite de charger des fichiers JSON lourds côté client
CREATE OR REPLACE FUNCTION public.get_supervision_records()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    dept TEXT,
    temp FLOAT,
    tx_day FLOAT,
    tn_day FLOAT,
    gust_day FLOAT,
    rain_day FLOAT,
    clim JSONB,
    last_obs TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.station_id as id,
        COALESCE(sc.name, l.station_id) as name,
        substring(l.station_id, 1, 2) as dept,
        l.t as temp,
        e.tx_day,
        e.tn_day,
        e.gust_day,
        e.rain_day,
        sc.data as clim,
        l.obs_time as last_obs
    FROM 
        public.get_france_live() l
    LEFT JOIN 
        public.national_extremes_day e ON l.station_id = e.station_id
    INNER JOIN 
        public.station_climatology sc ON l.station_id = sc.station_id
    WHERE 
        l.t IS NOT NULL;
END;
$$;

-- 3. Programmation de la mise à jour automatique à 4h00 du matin
-- Cette tâche appelle une Edge Function qui va scanner les fichiers .data de Météo-France
SELECT cron.schedule(
    'maj-climatologie-quotidienne',
    '0 4 * * *',
    $$
    select
        net.http_post(
            'https://ubdevaemtwbzxksjlhjg.supabase.co/functions/v1/update-climate-records',
            jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI'
            ),
            '{}'::jsonb
        ) as request_id;
    $$
);
