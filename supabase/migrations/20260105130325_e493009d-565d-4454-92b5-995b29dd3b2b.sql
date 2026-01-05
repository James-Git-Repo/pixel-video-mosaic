-- Create a general rate limiting table for edge function requests
CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_ip_endpoint_time 
  ON public.rate_limit_requests (ip_address, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_email_endpoint_time 
  ON public.rate_limit_requests (email, endpoint, created_at DESC) 
  WHERE email IS NOT NULL;

-- Enable RLS but only allow service_role access
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_service_role_only" ON public.rate_limit_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '2 hours';
END;
$$;