-- Remove the old duplicate policy that still allows public access
DROP POLICY IF EXISTS "sh_sel_service" ON public.slot_holds;