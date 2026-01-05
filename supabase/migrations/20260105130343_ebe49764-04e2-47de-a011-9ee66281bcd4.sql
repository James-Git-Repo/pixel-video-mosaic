-- Fix promo_code_attempts public exposure - restrict to service_role only
ALTER TABLE public.promo_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_attempts_service_role_only" ON public.promo_code_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);