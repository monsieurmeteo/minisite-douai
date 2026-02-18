-- RLS FIXES
-- Secure 'api_secrets'
ALTER TABLE public.api_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Robot Insert Secrets" ON public.api_secrets;
DROP POLICY IF EXISTS "Robot Update Secrets" ON public.api_secrets;
CREATE POLICY "Service Role Only Insert" ON public.api_secrets FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service Role Only Update" ON public.api_secrets FOR UPDATE USING (auth.role() = 'service_role');

-- Secure 'observations_6mn'
ALTER TABLE public.observations_6mn ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ecriture publique" ON public.observations_6mn;
DROP POLICY IF EXISTS "Mise à jour publique" ON public.observations_6mn;
CREATE POLICY "Service Role Write Only" ON public.observations_6mn FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service Role Update Only" ON public.observations_6mn FOR UPDATE USING (auth.role() = 'service_role');

-- Secure 'observations_horaire'
ALTER TABLE IF EXISTS public.observations_horaire ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ecriture publique temporaire" ON public.observations_horaire;
DROP POLICY IF EXISTS "Mise à jour publique" ON public.observations_horaire;
CREATE POLICY "Service Role Write Only Temp" ON public.observations_horaire FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service Role Update Only Temp" ON public.observations_horaire FOR UPDATE USING (auth.role() = 'service_role');

-- Secure 'user_alerts'
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON public.user_alerts;
-- Allow Public Insert (for registration), Block Update/Delete/Select for now unless Owner management is added
CREATE POLICY "Public Insert" ON public.user_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Full" ON public.user_alerts FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on Public Read Tables
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Stations" ON public.stations;
CREATE POLICY "Public Read Stations" ON public.stations FOR SELECT USING (true);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Summaries" ON public.daily_summaries;
CREATE POLICY "Public Read Summaries" ON public.daily_summaries FOR SELECT USING (true);

ALTER TABLE public.stations_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Metadata" ON public.stations_metadata;
CREATE POLICY "Public Read Metadata" ON public.stations_metadata FOR SELECT USING (true);


-- FUNCTION SEARCH PATH FIXES
ALTER FUNCTION public.get_instant_observations SET search_path = public;
ALTER FUNCTION public.set_station_dept SET search_path = public;
ALTER FUNCTION public.find_nearest_stations SET search_path = public;
ALTER FUNCTION public.check_smart_alerts SET search_path = public;
ALTER FUNCTION public.update_stations_coordinates SET search_path = public;
ALTER FUNCTION public.get_daily_extremes_full SET search_path = public;
ALTER FUNCTION public.get_daily_extremes SET search_path = public;
ALTER FUNCTION public.refresh_daily_summaries SET search_path = public;
ALTER FUNCTION public.get_daily_extremes_fast SET search_path = public;
ALTER FUNCTION public.get_daily_extremes_region SET search_path = public;
ALTER FUNCTION public.recuperer_meteo_nord SET search_path = public;

-- VIEW FIX (Make it run as caller, not creator)
-- Note: Requires PostgreSQL 15+ for this syntax, or just recreation.
-- Supabase mostly runs PG 15. If this fails, the view needs to be dropped and recreated without security definer.
ALTER VIEW public.view_latest_extremes SET (security_invoker = true);
