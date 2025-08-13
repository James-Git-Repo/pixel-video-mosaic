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

    // Use the atomic function for slot reservation
    const { data: result, error: atomicError } = await supabaseClient.rpc('create_slot_hold_atomic', {
      p_user_id: userData.user.id,
      p_top_left: top_left,
      p_bottom_right: bottom_right,
      p_slot_ids: expectedSlotIds,
      p_expires_minutes: 15
    });

    if (atomicError) {
      if (atomicError.message?.includes('slot_taken')) {
        return new Response(JSON.stringify({ 
          error: "Some slots are no longer available", 
          code: 'SLOT_TAKEN' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
      
      console.error('Atomic function error:', atomicError);
      return new Response(JSON.stringify({ error: "Failed to reserve slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      hold_id: result[0].hold_id,
      slot_count: expectedSlotIds.length,
      top_left,
      bottom_right,
      expires_at: result[0].expires_at,
      width: c2 - c1 + 1,
      height: r2 - r1 + 1
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