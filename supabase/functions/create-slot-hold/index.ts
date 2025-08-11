import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using service role key for privileged operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { top_left, bottom_right, slot_ids } = await req.json();

    // Validate input format
    if (!top_left || !bottom_right) {
      return new Response(JSON.stringify({ error: "Missing top_left or bottom_right" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Parse coordinates
    const [r1, c1] = top_left.split('-').map(Number);
    const [r2, c2] = bottom_right.split('-').map(Number);

    // Validate rectangle bounds
    if (isNaN(r1) || isNaN(c1) || isNaN(r2) || isNaN(c2) || r2 < r1 || c2 < c1) {
      return new Response(JSON.stringify({ error: "Invalid rectangle coordinates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Compute expected slot IDs
    const expectedSlotIds: string[] = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        expectedSlotIds.push(`${r}-${c}`);
      }
    }

    // Validate provided slot_ids if given
    if (slot_ids) {
      const providedSet = new Set(slot_ids);
      const expectedSet = new Set(expectedSlotIds);
      
      if (providedSet.size !== expectedSet.size || 
          !expectedSlotIds.every(id => providedSet.has(id))) {
        return new Response(JSON.stringify({ error: "Provided slot_ids don't match rectangle" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Check for conflicts in a transaction
    const { data: conflicts, error: conflictError } = await supabaseClient.rpc('check_slot_conflicts', {
      slot_ids_input: expectedSlotIds
    });

    if (conflictError) {
      // If RPC doesn't exist, do manual checks
      console.log("RPC not found, doing manual conflict check");
      
      // Check occupied slots
      const { data: occupiedConflicts } = await supabaseClient
        .from('occupied_slot_items')
        .select('slot_id')
        .in('slot_id', expectedSlotIds);

      // Check admin videos
      const { data: adminConflicts } = await supabaseClient
        .from('admin_video_items')
        .select('slot_id')
        .in('slot_id', expectedSlotIds);

      // Check active holds
      const { data: holdConflicts } = await supabaseClient
        .from('slot_hold_items')
        .select('slot_id, slot_holds!inner(expires_at)')
        .in('slot_id', expectedSlotIds)
        .gt('slot_holds.expires_at', new Date().toISOString());

      if ((occupiedConflicts && occupiedConflicts.length > 0) ||
          (adminConflicts && adminConflicts.length > 0) ||
          (holdConflicts && holdConflicts.length > 0)) {
        return new Response(JSON.stringify({ 
          code: 'SLOT_TAKEN',
          error: "Some slots are already taken or held"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
    } else if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ 
        code: 'SLOT_TAKEN',
        error: "Some slots are already taken or held"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Create hold in transaction
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { data: holdData, error: holdError } = await supabaseClient
      .from('slot_holds')
      .insert({
        user_id: userData.user.id,
        top_left,
        bottom_right,
        expires_at: expiresAt
      })
      .select('id')
      .single();

    if (holdError) {
      console.error('Error creating hold:', holdError);
      return new Response(JSON.stringify({ error: "Failed to create hold" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Insert hold items
    const holdItems = expectedSlotIds.map(slot_id => ({
      hold_id: holdData.id,
      slot_id
    }));

    const { error: itemsError } = await supabaseClient
      .from('slot_hold_items')
      .insert(holdItems);

    if (itemsError) {
      console.error('Error creating hold items:', itemsError);
      // Clean up the hold if items failed
      await supabaseClient.from('slot_holds').delete().eq('id', holdData.id);
      
      if (itemsError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ 
          code: 'SLOT_TAKEN',
          error: "Slots were taken during hold creation"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to reserve slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      hold_id: holdData.id,
      slot_count: expectedSlotIds.length,
      top_left,
      bottom_right,
      expires_at: expiresAt
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-slot-hold:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});