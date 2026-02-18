-- Table pour stocker les configurations de stations personnalisées et alertes
CREATE TABLE IF NOT EXISTS public.user_station_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Identifiant utilisateur (on peut utiliser un ID généré ou le ntfy_topic comme clé si pas de auth)
    ntfy_topic TEXT NOT NULL,
    
    -- Localisation
    city_name TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    zip_code TEXT,
    
    -- Station Météo de référence
    nearest_station_id TEXT,
    nearest_station_name TEXT,
    
    -- Seuils d'alertes
    alert_wind_enabled BOOLEAN DEFAULT false,
    alert_wind_threshold FLOAT8 DEFAULT 80, -- km/h
    
    alert_rain_enabled BOOLEAN DEFAULT false,
    alert_rain_threshold FLOAT8 DEFAULT 10, -- mm/h
    
    alert_tmin_enabled BOOLEAN DEFAULT false,
    alert_tmin_threshold FLOAT8 DEFAULT 0, -- °C
    
    alert_tmax_enabled BOOLEAN DEFAULT false,
    alert_tmax_threshold FLOAT8 DEFAULT 35, -- °C
    
    alert_foudre_enabled BOOLEAN DEFAULT true,
    alert_foudre_radius FLOAT8 DEFAULT 10, -- km
    
    alert_vigilance_enabled BOOLEAN DEFAULT true -- Orange/Rouge
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_user_station_ntfy ON public.user_station_configs(ntfy_topic);

-- Activer RLS pour la sécurité (on permet l'upsert public pour ce minisite)
ALTER TABLE public.user_station_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public upsert for configs" ON public.user_station_configs
    FOR ALL USING (true) WITH CHECK (true);
