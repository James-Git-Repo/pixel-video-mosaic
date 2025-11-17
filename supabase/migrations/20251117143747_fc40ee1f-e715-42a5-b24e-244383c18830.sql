-- Create table to track promo code attempts
CREATE TABLE public.promo_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for optimal performance
CREATE INDEX idx_promo_attempts_ip ON public.promo_code_attempts(ip_address, attempted_at);
CREATE INDEX idx_promo_attempts_email ON public.promo_code_attempts(email, attempted_at);
CREATE INDEX idx_promo_attempts_cleanup ON public.promo_code_attempts(attempted_at);

-- Enable RLS: only service_role can access
ALTER TABLE public.promo_code_attempts ENABLE ROW LEVEL SECURITY;

-- Function to cleanup old attempts (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_promo_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.promo_code_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;