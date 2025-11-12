-- Allow anonymous purchases by making user_id nullable
ALTER TABLE slot_holds 
ALTER COLUMN user_id DROP NOT NULL;

-- Add email tracking for anonymous users
ALTER TABLE slot_holds
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_slot_holds_email ON slot_holds(email);

-- Update RLS policies for slot_holds to allow public access
DROP POLICY IF EXISTS sh_sel_own ON slot_holds;
DROP POLICY IF EXISTS sh_ins_own ON slot_holds;
DROP POLICY IF EXISTS sh_del_own ON slot_holds;

CREATE POLICY sh_sel_public ON slot_holds
FOR SELECT USING (true);

CREATE POLICY sh_ins_public ON slot_holds
FOR INSERT WITH CHECK (true);

CREATE POLICY sh_del_service ON slot_holds
FOR DELETE USING (true);

-- Update RLS policies for slot_hold_items to allow public access
DROP POLICY IF EXISTS shi_sel_own ON slot_hold_items;
DROP POLICY IF EXISTS shi_ins_own ON slot_hold_items;
DROP POLICY IF EXISTS shi_del_own ON slot_hold_items;

CREATE POLICY shi_sel_public ON slot_hold_items
FOR SELECT USING (true);

CREATE POLICY shi_ins_public ON slot_hold_items
FOR INSERT WITH CHECK (true);

CREATE POLICY shi_del_service ON slot_hold_items
FOR DELETE USING (true);