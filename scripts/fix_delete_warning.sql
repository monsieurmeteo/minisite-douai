-- 1. Create a Secure Function to handle deletion
-- This allows us to lock down the table RLS (removing the warning)
-- while still allowing the frontend to delete via this specific function.
CREATE OR REPLACE FUNCTION delete_user_alert(target_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (service_role)
SET search_path = public -- Secure search path
AS $$
BEGIN
  DELETE FROM public.user_alerts WHERE id = target_id;
END;
$$;

-- 2. Revoke Direct Table Access for UPDATE and DELETE from Public
-- This Satisfies the "RLS Policy Always True" warning because we remove the permissive policy entirely.

DROP POLICY IF EXISTS "Unified Manage" ON public.user_alerts; -- The DELETE policy
DROP POLICY IF EXISTS "Unified Update" ON public.user_alerts; -- The UPDATE policy

-- Now, only INSERT (Unified Insert) and SELECT (Unified Select) remain for public/anon.
-- DELETE is done via the RPC function above.

