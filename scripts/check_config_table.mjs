import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ubdevaemtwbzxksjlhjg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGV2YWVtdHdienhrc2psaGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2NTA2OCwiZXhwIjoyMDg0MzQxMDY4fQ.RC_D6wljCTi1WEf0aG3QoEf1ZH_sJkP9TiVXXAovMzI'
);

async function checkTable() {
    const { error } = await supabase.from('user_station_configs').select('*').limit(1);
    if (error) {
        console.log("Table check failed:", error.message);
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            console.log("CREATING TABLE...");
            const sql = `
                CREATE TABLE IF NOT EXISTS public.user_station_configs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    created_at TIMESTAMPTZ DEFAULT now(),
                    updated_at TIMESTAMPTZ DEFAULT now(),
                    ntfy_topic TEXT NOT NULL,
                    city_name TEXT NOT NULL,
                    lat FLOAT8 NOT NULL,
                    lon FLOAT8 NOT NULL,
                    zip_code TEXT,
                    nearest_station_id TEXT,
                    nearest_station_name TEXT,
                    alert_wind_enabled BOOLEAN DEFAULT false,
                    alert_wind_threshold FLOAT8 DEFAULT 80,
                    alert_rain_enabled BOOLEAN DEFAULT false,
                    alert_rain_threshold FLOAT8 DEFAULT 10,
                    alert_tmin_enabled BOOLEAN DEFAULT false,
                    alert_tmin_threshold FLOAT8 DEFAULT 0,
                    alert_tmax_enabled BOOLEAN DEFAULT false,
                    alert_tmax_threshold FLOAT8 DEFAULT 35,
                    alert_foudre_enabled BOOLEAN DEFAULT true,
                    alert_foudre_radius FLOAT8 DEFAULT 10,
                    alert_vigilance_enabled BOOLEAN DEFAULT true
                );
                ALTER TABLE public.user_station_configs ENABLE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS "Allow public upsert for configs" ON public.user_station_configs;
                CREATE POLICY "Allow public upsert for configs" ON public.user_station_configs
                    FOR ALL USING (true) WITH CHECK (true);
            `;
            // We can't run raw SQL via public client generally, but let's see if we can at least report it.
            console.log("Please run the provided SETUP_USER_STATION.sql in your Supabase SQL Editor.");
        }
    } else {
        console.log("Table exists and is accessible.");
    }
}

checkTable();
