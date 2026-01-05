-- Fix PUBLIC_DATA_EXPOSURE: Restrict slot_holds SELECT to service_role only
-- The current policy allows public SELECT which exposes email addresses

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "sh_sel_service" ON public.slot_holds;

-- Create a new policy that only allows service_role to SELECT
-- This is sufficient because all edge functions use service_role key
CREATE POLICY "sh_sel_service_role_only" ON public.slot_holds
  FOR SELECT TO service_role USING (true);