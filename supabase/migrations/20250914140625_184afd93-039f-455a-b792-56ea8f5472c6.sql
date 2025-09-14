-- Fix security vulnerability: Make user_id NOT NULL and strengthen RLS policies
-- This prevents potential data exposure through NULL user_id records

-- 1. Make user_id column NOT NULL to prevent ownership bypass
ALTER TABLE public.video_submissions 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Drop existing INSERT policy and create a stronger one
DROP POLICY IF EXISTS "vs_ins" ON public.video_submissions;

-- 3. Create new INSERT policy that ensures user_id matches authenticated user
CREATE POLICY "vs_ins_secure" ON public.video_submissions
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- 4. Strengthen the SELECT policy to be more explicit about NULL handling
DROP POLICY IF EXISTS "vs_sel" ON public.video_submissions;

CREATE POLICY "vs_sel_secure" ON public.video_submissions
FOR SELECT 
USING (
  (user_id = auth.uid() AND user_id IS NOT NULL AND auth.uid() IS NOT NULL) 
  OR is_admin()
);

-- 5. Add a constraint to ensure email is always provided for accountability
ALTER TABLE public.video_submissions 
ALTER COLUMN email SET NOT NULL;

-- 6. Add check constraint to ensure payment_intent_id is always provided for financial tracking
ALTER TABLE public.video_submissions 
ALTER COLUMN payment_intent_id SET NOT NULL;