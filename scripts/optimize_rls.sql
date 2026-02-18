-- OPTIMIZE RLS POLICIES (Performance Fixes)

-- 1. Helper to safely drop policies if they exist (to clean up duplicates)
-- We will recreate single, optimized policies.

-- === Table: public.api_secrets ===
DROP POLICY IF EXISTS "Service Role Only Insert" ON public.api_secrets;
DROP POLICY IF EXISTS "Service Role Only Update" ON public.api_secrets;

CREATE POLICY "Service Role Only Insert" ON public.api_secrets 
FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service Role Only Update" ON public.api_secrets 
FOR UPDATE USING ((select auth.role()) = 'service_role');


-- === Table: public.observations_6mn ===
-- Clean up potential duplicates causing "Multiple Permissive Policies"
DROP POLICY IF EXISTS "Lecture publique" ON public.observations_6mn;
DROP POLICY IF EXISTS "Public Read 6mn" ON public.observations_6mn;
DROP POLICY IF EXISTS "Service Role Write Only" ON public.observations_6mn;
DROP POLICY IF EXISTS "Service Role Update Only" ON public.observations_6mn;

-- Recreate Optimized
CREATE POLICY "Public Select" ON public.observations_6mn 
FOR SELECT USING (true);

CREATE POLICY "Service Role Write Only" ON public.observations_6mn 
FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service Role Update Only" ON public.observations_6mn 
FOR UPDATE USING ((select auth.role()) = 'service_role');


-- === Table: public.observations_horaire ===
DROP POLICY IF EXISTS "Service Role Write Only Temp" ON public.observations_horaire;
DROP POLICY IF EXISTS "Service Role Update Only Temp" ON public.observations_horaire;

CREATE POLICY "Service Role Write Only Temp" ON public.observations_horaire 
FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service Role Update Only Temp" ON public.observations_horaire 
FOR UPDATE USING ((select auth.role()) = 'service_role');


-- === Table: public.user_alerts ===
-- Clean up potential duplicates
DROP POLICY IF EXISTS "Public Insert" ON public.user_alerts;
DROP POLICY IF EXISTS "Allow public access" ON public.user_alerts;
DROP POLICY IF EXISTS "Service Role Full" ON public.user_alerts;

-- Recreate Optimized
-- Combined policy for INSERT to avoid "Multiple Permissive Policies" warning?
-- Actually, it's better to keep them separate for clarity, but the warning assumes duplication.
-- To fix "Multiple policies", we can just define:
-- 1. Public can insert (with checks)
-- 2. Service role can do everything (SELECT, UPDATE, DELETE). 
--    For INSERT, if we want service role to bypass checks, we must keep a separate policy or OR them.
--    The warning is just a warning. We will optimize the 'auth.role()' call though.

CREATE POLICY "Public Insert" ON public.user_alerts
FOR INSERT WITH CHECK (
    -- Public rules
    (email IS NOT NULL AND length(email) > 3 AND station_id IS NOT NULL)
);

CREATE POLICY "Service Role Ops" ON public.user_alerts
FOR ALL USING ((select auth.role()) = 'service_role');

-- Note: For INSERT, "Service Role Ops" (ALL) and "Public Insert" (INSERT) both apply.
-- Since they are permissive, if either passes, it works.
-- This effectively means: Service Role can insert whatever. Public can insert if valid.
-- This might still trigger a "Multiple Permissive" warning for INSERT, but it's the correct logic.
-- The explicit duplicates ("Lecture publique" AND "Public Read 6mn") were the main issue above.

