-- Remove admin-related tables
DROP TABLE IF EXISTS public.admin_video_items CASCADE;
DROP TABLE IF EXISTS public.admin_videos CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the is_admin function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_submissions() CASCADE;

-- Update RLS policies to remove admin references
-- video_submissions policies
DROP POLICY IF EXISTS vs_sel_secure ON public.video_submissions;
DROP POLICY IF EXISTS vs_upd ON public.video_submissions;
DROP POLICY IF EXISTS vs_del ON public.video_submissions;

CREATE POLICY "vs_sel_own" ON public.video_submissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "vs_upd_own" ON public.video_submissions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- occupied_slots policies
DROP POLICY IF EXISTS os_sel ON public.occupied_slots;
DROP POLICY IF EXISTS os_ins ON public.occupied_slots;
DROP POLICY IF EXISTS os_upd ON public.occupied_slots;
DROP POLICY IF EXISTS os_del ON public.occupied_slots;

CREATE POLICY "os_sel_all" ON public.occupied_slots
FOR SELECT
TO authenticated
USING (true);

-- occupied_slot_items policies
DROP POLICY IF EXISTS osi_sel ON public.occupied_slot_items;
DROP POLICY IF EXISTS osi_ins ON public.occupied_slot_items;
DROP POLICY IF EXISTS osi_upd ON public.occupied_slot_items;
DROP POLICY IF EXISTS osi_del ON public.occupied_slot_items;

CREATE POLICY "osi_sel_all" ON public.occupied_slot_items
FOR SELECT
TO authenticated
USING (true);

-- orders policies
DROP POLICY IF EXISTS orders_select_own ON public.orders;

CREATE POLICY "orders_sel_own" ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- order_slots policies
DROP POLICY IF EXISTS order_slots_select_own ON public.order_slots;

CREATE POLICY "order_slots_sel_own" ON public.order_slots
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.id = order_slots.order_id 
  AND o.user_id = auth.uid()
));

-- reservations policies
DROP POLICY IF EXISTS reservations_select_own ON public.reservations;
DROP POLICY IF EXISTS reservations_modify_admin ON public.reservations;

CREATE POLICY "reservations_sel_own" ON public.reservations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- slot_hold_items policies
DROP POLICY IF EXISTS shi_sel ON public.slot_hold_items;
DROP POLICY IF EXISTS shi_ins ON public.slot_hold_items;
DROP POLICY IF EXISTS shi_del ON public.slot_hold_items;

CREATE POLICY "shi_sel_own" ON public.slot_hold_items
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM slot_holds h 
  WHERE h.id = slot_hold_items.hold_id 
  AND h.user_id = auth.uid()
));

CREATE POLICY "shi_ins_own" ON public.slot_hold_items
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM slot_holds h 
  WHERE h.id = slot_hold_items.hold_id 
  AND h.user_id = auth.uid()
));

CREATE POLICY "shi_del_own" ON public.slot_hold_items
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM slot_holds h 
  WHERE h.id = slot_hold_items.hold_id 
  AND h.user_id = auth.uid()
));

-- slot_holds policies
DROP POLICY IF EXISTS sh_ins ON public.slot_holds;
DROP POLICY IF EXISTS sh_sel ON public.slot_holds;
DROP POLICY IF EXISTS sh_del ON public.slot_holds;

CREATE POLICY "sh_sel_own" ON public.slot_holds
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "sh_ins_own" ON public.slot_holds
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "sh_del_own" ON public.slot_holds
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- slots policies
DROP POLICY IF EXISTS slots_modify_admin ON public.slots;

-- pricing policies
DROP POLICY IF EXISTS pricing_modify_admin ON public.pricing;

-- Add url field to video_submissions
ALTER TABLE public.video_submissions
ADD COLUMN IF NOT EXISTS linked_url text;