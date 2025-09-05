// supabase/functions/free-checkout/index.ts
// TESTING: POST with { email, slots, promo_code: "xfgkqwhe9pèàlDòIJ2+QR0EI2" } → creates free submission
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use constant-time comparison for security
const VALID_PROMO_CODE = "xfgkqwhe9pèàlDòIJ2+QR0EI2";

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { email, hold_id, promo_code } = await req.json();

    // Validate promo code with constant-time comparison
    if (!constantTimeCompare(promo_code, VALID_PROMO_CODE)) {
      console.log(`Invalid promo code attempt: ${promo_code?.substring(0, 5)}...`);
      return new Response(JSON.stringify({ error: "Invalid promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify hold exists and belongs to user
    const { data: hold, error: holdError } = await supabase
      .from('slot_holds')
      .select('*')
      .eq('id', hold_id)
      .eq('user_id', user.id)
      .single();

    if (holdError || !hold) {
      return new Response(JSON.stringify({ error: "Invalid or expired slot hold" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Count slots for this hold
    const { count: slotCount, error: countError } = await supabase
      .from('slot_hold_items')
      .select('*', { count: 'exact' })
      .eq('hold_id', hold_id);

    if (countError || slotCount === null) {
      return new Response(JSON.stringify({ error: "Failed to verify slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Use service role to create submission
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create free video submission
    const { data: submission, error: submissionError } = await adminClient
      .from('video_submissions')
      .insert({
        user_id: user.id,
        email: email || user.email,
        top_left: hold.top_left,
        bottom_right: hold.bottom_right,
        amount_cents: 0,
        currency: 'usd',
        payment_intent_id: 'FREE-CODE',
        status: 'under_review',
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Failed to create free submission:', submissionError);
      return new Response(JSON.stringify({ error: "Failed to create submission" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Delete hold atomically
    await adminClient.from('slot_hold_items').delete().eq('hold_id', hold_id);
    await adminClient.from('slot_holds').delete().eq('id', hold_id);

    console.log(`Free checkout completed: ${submission.id} for ${slotCount} slots`);

    return new Response(JSON.stringify({ 
      ok: true,
      submission_id: submission.id,
      free_checkout: true,
      slot_count: slotCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in free-checkout:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});