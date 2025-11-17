-- Drop old payment system tables and functions

-- Drop function
DROP FUNCTION IF EXISTS public.clean_expired_reservations();

-- Drop tables in correct order (handle foreign keys)
DROP TABLE IF EXISTS public.order_slots CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;