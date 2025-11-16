-- Drop RLS policies that depend on user_id column for video_submissions
DROP POLICY IF EXISTS vs_sel_own ON video_submissions;
DROP POLICY IF EXISTS vs_ins_secure ON video_submissions;
DROP POLICY IF EXISTS vs_upd_own ON video_submissions;

-- Drop foreign key constraints that reference auth.users
ALTER TABLE slot_holds 
DROP CONSTRAINT IF EXISTS slot_holds_user_id_fkey;

ALTER TABLE video_submissions 
DROP CONSTRAINT IF EXISTS video_submissions_user_id_fkey;

-- Change slot_holds.user_id from UUID to TEXT to support anonymous users
ALTER TABLE slot_holds 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Change video_submissions.user_id from UUID to TEXT to support anonymous users
ALTER TABLE video_submissions 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Recreate RLS policies for video_submissions
-- Since we're using anonymous users (TEXT hashes), we can't use auth.uid()
-- Edge functions use service_role which bypasses RLS, so these policies
-- are mainly for potential future authenticated access

-- Allow service role and edge functions full access (they bypass RLS anyway)
-- No policies needed for regular users since all access is through edge functions