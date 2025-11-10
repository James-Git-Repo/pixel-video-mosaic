-- Remove overly permissive INSERT policies that allow fake order creation
DROP POLICY IF EXISTS "orders_insert_service" ON public.orders;
DROP POLICY IF EXISTS "order_slots_insert_service" ON public.order_slots;

-- No RLS policies needed for INSERT - service role bypasses RLS
-- Only edge functions with service role can insert orders/order_slots
-- Regular users (anon/authenticated) will get permission denied, which is correct