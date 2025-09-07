import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try {
    // Create service role client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('Running cleanup of expired slot reservations...');

    // Call the cleanup function
    const { error } = await supabase.rpc('clean_expired_reservations');

    if (error) {
      console.error('Error cleaning expired reservations:', error);
      throw error;
    }

    console.log('Successfully cleaned expired reservations');

    return new Response(
      JSON.stringify({ success: true, message: 'Cleanup completed' }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});