-- Create atomic slot hold function
CREATE OR REPLACE FUNCTION public.create_slot_hold_atomic(
  p_user_id UUID,
  p_top_left TEXT,
  p_bottom_right TEXT,
  p_slot_ids TEXT[],
  p_expires_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(hold_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hold_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_slot_id TEXT;
  v_conflict_count INTEGER;
BEGIN
  -- Set expiration time
  v_expires_at := NOW() + (p_expires_minutes || ' minutes')::INTERVAL;
  
  -- Check for any conflicts in a single query
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT slot_id FROM occupied_slot_items WHERE slot_id = ANY(p_slot_ids)
    UNION ALL
    SELECT slot_id FROM admin_video_items WHERE slot_id = ANY(p_slot_ids)
    UNION ALL
    SELECT shi.slot_id 
    FROM slot_hold_items shi
    JOIN slot_holds sh ON shi.hold_id = sh.id
    WHERE shi.slot_id = ANY(p_slot_ids) AND sh.expires_at > NOW()
  ) conflicts;
  
  -- If any conflicts found, raise exception
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_taken';
  END IF;
  
  -- Create the hold
  INSERT INTO slot_holds (user_id, top_left, bottom_right, expires_at)
  VALUES (p_user_id, p_top_left, p_bottom_right, v_expires_at)
  RETURNING id INTO v_hold_id;
  
  -- Insert all slot hold items at once
  INSERT INTO slot_hold_items (hold_id, slot_id)
  SELECT v_hold_id, unnest(p_slot_ids);
  
  -- Return the results
  hold_id := v_hold_id;
  expires_at := v_expires_at;
  RETURN NEXT;
END;
$$;