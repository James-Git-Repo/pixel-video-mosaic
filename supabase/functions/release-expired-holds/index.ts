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
    // Create Supabase client using service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();

    // Find expired holds
    const { data: expiredHolds, error: findError } = await supabaseClient
      .from('slot_holds')
      .select('id')
      .lt('expires_at', now);

    if (findError) {
      console.error('Error finding expired holds:', findError);
      return new Response(JSON.stringify({ error: "Failed to find expired holds" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!expiredHolds || expiredHolds.length === 0) {
      console.log('No expired holds found');
      return new Response(JSON.stringify({ 
        message: "No expired holds to release",
        released_count: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const expiredHoldIds = expiredHolds.map(hold => hold.id);
    console.log(`Found ${expiredHoldIds.length} expired holds to release`);

    // Delete hold items first (foreign key constraint)
    const { error: itemsDeleteError } = await supabaseClient
      .from('slot_hold_items')
      .delete()
      .in('hold_id', expiredHoldIds);

    if (itemsDeleteError) {
      console.error('Error deleting expired hold items:', itemsDeleteError);
      return new Response(JSON.stringify({ error: "Failed to delete hold items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Delete the holds themselves
    const { error: holdsDeleteError } = await supabaseClient
      .from('slot_holds')
      .delete()
      .in('id', expiredHoldIds);

    if (holdsDeleteError) {
      console.error('Error deleting expired holds:', holdsDeleteError);
      return new Response(JSON.stringify({ error: "Failed to delete holds" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Successfully released ${expiredHoldIds.length} expired holds`);

    return new Response(JSON.stringify({
      message: "Expired holds released successfully",
      released_count: expiredHoldIds.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in release-expired-holds:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});