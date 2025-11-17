import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const SlotHoldSchema = z.object({
  email: z.string().email().max(255),
  top_left: z.string().regex(/^\d{1,3}-\d{1,3}$/).max(10),
  bottom_right: z.string().regex(/^\d{1,3}-\d{1,3}$/).max(10),
  slot_ids: z.array(z.string().max(10)).optional(),
});

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

    const body = await req.json();
    
    // Validate input using Zod schema
    const validation = SlotHoldSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { email, top_left, bottom_right, slot_ids } = validation.data;

    // Generate deterministic anonymous user ID from email
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const anonymousUserId = hashArray.slice(0, 16)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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
      p_user_id: anonymousUserId,
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
      
      console.error('Slot hold creation failed:', atomicError.code);
      return new Response(JSON.stringify({ error: "Failed to reserve slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Update hold with email for tracking
    if (result && result[0]) {
      await supabaseClient
        .from('slot_holds')
        .update({ email: email })
        .eq('id', result[0].hold_id);
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
    console.error('Hold creation failed');
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});