-- Create slots table
CREATE TABLE IF NOT EXISTS public.slots (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'reserved', 'sold')),
  reserved_by UUID,
  reserved_expires_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id),
  term_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pricing table
CREATE TABLE IF NOT EXISTS public.pricing (
  key TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  term TEXT NOT NULL CHECK (term IN ('1y', 'permanent')),
  slot_count INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'canceled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reservation_id UUID REFERENCES public.reservations(id),
  slot_count INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  term TEXT NOT NULL CHECK (term IN ('1y', 'permanent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_slots mapping table
CREATE TABLE IF NOT EXISTS public.order_slots (
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  slot_id TEXT REFERENCES public.slots(id) ON DELETE CASCADE,
  PRIMARY KEY(order_id, slot_id)
);

-- Enable RLS on all tables
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for slots
CREATE POLICY "slots_select_all" ON public.slots
  FOR SELECT USING (true);

CREATE POLICY "slots_modify_admin" ON public.slots
  FOR ALL USING (is_admin());

-- RLS Policies for pricing
CREATE POLICY "pricing_select_all" ON public.pricing
  FOR SELECT USING (true);

CREATE POLICY "pricing_modify_admin" ON public.pricing
  FOR ALL USING (is_admin());

-- RLS Policies for reservations
CREATE POLICY "reservations_select_own" ON public.reservations
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "reservations_insert_own" ON public.reservations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reservations_modify_admin" ON public.reservations
  FOR UPDATE USING (is_admin());

-- RLS Policies for orders
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "orders_insert_service" ON public.orders
  FOR INSERT WITH CHECK (true);

-- RLS Policies for order_slots
CREATE POLICY "order_slots_select_own" ON public.order_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "order_slots_insert_service" ON public.order_slots
  FOR INSERT WITH CHECK (true);

-- Insert default pricing
INSERT INTO public.pricing (key, amount_cents, description) VALUES
  ('slot_1y', 50, '1-year billboard slot'),
  ('slot_permanent', 200, 'Permanent billboard slot')
ON CONFLICT (key) DO NOTHING;

-- Create function to clean expired reservations
CREATE OR REPLACE FUNCTION public.clean_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update expired reservations
  UPDATE reservations 
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
  
  -- Free up slots from expired reservations
  UPDATE slots 
  SET status = 'free', reserved_by = NULL, reserved_expires_at = NULL
  WHERE status = 'reserved' AND reserved_expires_at < now();
END;
$$;

-- Populate slots table with initial data (1000x1000 grid)
DO $$
DECLARE
  row_num INTEGER;
  col_num INTEGER;
BEGIN
  -- Only insert if slots table is empty
  IF NOT EXISTS (SELECT 1 FROM public.slots LIMIT 1) THEN
    FOR row_num IN 0..999 LOOP
      FOR col_num IN 0..999 LOOP
        INSERT INTO public.slots (id, status) 
        VALUES (row_num || '-' || col_num, 'free');
      END LOOP;
    END LOOP;
  END IF;
END $$;