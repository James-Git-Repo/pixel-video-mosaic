-- Add SELECT RLS policy to slot_holds table
CREATE POLICY "sh_sel_service" ON public.slot_holds
FOR SELECT
TO public
USING (true);