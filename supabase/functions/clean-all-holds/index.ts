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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('Starting cleanup of all holds and occupied slots...');

    // Delete all slot hold items
    const { error: holdItemsError } = await supabaseClient
      .from('slot_hold_items')
      .delete()
      .neq('slot_id', ''); // Delete all

    if (holdItemsError) {
      console.error('Error deleting slot_hold_items:', holdItemsError);
    } else {
      console.log('✓ Deleted all slot_hold_items');
    }

    // Delete all slot holds
    const { error: holdsError } = await supabaseClient
      .from('slot_holds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (holdsError) {
      console.error('Error deleting slot_holds:', holdsError);
    } else {
      console.log('✓ Deleted all slot_holds');
    }

    // Delete all occupied slot items
    const { error: occupiedItemsError } = await supabaseClient
      .from('occupied_slot_items')
      .delete()
      .neq('slot_id', ''); // Delete all

    if (occupiedItemsError) {
      console.error('Error deleting occupied_slot_items:', occupiedItemsError);
    } else {
      console.log('✓ Deleted all occupied_slot_items');
    }

    // Delete all occupied slots
    const { error: occupiedError } = await supabaseClient
      .from('occupied_slots')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (occupiedError) {
      console.error('Error deleting occupied_slots:', occupiedError);
    } else {
      console.log('✓ Deleted all occupied_slots');
    }

    console.log('Cleanup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All holds and occupied slots cleaned successfully'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Cleanup failed:', error);
    return new Response(
      JSON.stringify({ error: "Failed to clean database" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
