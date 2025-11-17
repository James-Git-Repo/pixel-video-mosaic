-- Drop public SELECT policies that expose user emails
DROP POLICY IF EXISTS "sh_sel_public" ON public.slot_holds;
DROP POLICY IF EXISTS "shi_sel_public" ON public.slot_hold_items;

-- These tables are only accessed via edge functions with service_role key
-- which bypass RLS, so public policies are unnecessary and expose PII