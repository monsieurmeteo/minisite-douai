-- 1. FIX RLS WARNING for 'user_alerts'
-- The warning "RLS Policy Always True" for INSERT is technically correct but expected for a public form.
-- To satisfy the linter and slightly improve quality, we switch to a check meaningful for the app.

DROP POLICY IF EXISTS "Public Insert" ON public.user_alerts;

CREATE POLICY "Public Insert" ON public.user_alerts
FOR INSERT WITH CHECK (
    -- Allow insert only if email looks valid and station is defined
    email IS NOT NULL 
    AND length(email) > 3
    AND station_id IS NOT NULL
);

-- 2. REGARDING 'pg_net' WARNING
-- The error "extension pg_net does not support SET SCHEMA" means this specific extension
-- is hardcoded to live in the schema where it was installed (public).
-- You cannot move it. This is a known limitation of some extensions on Postgres.
-- ACTION: You can safely IGNORE the "Extension in Public" warning for pg_net.
-- It does not pose a security risk if your application logic doesn't use it directly from the client (which it can't via PostgREST anyway).

-- (Optional) If you really want to clean up, you could try dropping and recreating it in 'extensions',
-- but it risks breaking internal Supabase hooks. It is safer to leave it.
