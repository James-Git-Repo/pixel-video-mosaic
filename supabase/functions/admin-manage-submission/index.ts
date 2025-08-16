
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, submission_id, reason } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get submission details
    const { data: submission, error: fetchError } = await supabase
      .from('admin_video_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (action === 'approve') {
      // Insert into occupied_slots and occupied_slot_items
      const { data: occupiedSlot, error: occupiedError } = await supabase
        .from('occupied_slots')
        .insert({
          submission_id: submission_id,
          slot_id: submission.top_left,
          video_url: submission.poster_url,
          top_left: submission.top_left,
          bottom_right: submission.bottom_right,
          video_asset_id: submission.poster_url
        })
        .select('id')
        .single();

      if (occupiedError) throw occupiedError;

      // Generate slot IDs and insert into occupied_slot_items
      const slotItems = [];
      const [startRow, startCol] = submission.top_left.split('-').map(Number);
      const [endRow, endCol] = submission.bottom_right.split('-').map(Number);
      
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          slotItems.push({
            occupied_id: occupiedSlot.id,
            slot_id: `${row}-${col}`
          });
        }
      }

      const { error: itemsError } = await supabase
        .from('occupied_slot_items')
        .insert(slotItems);

      if (itemsError) throw itemsError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('id', submission_id);

      if (updateError) throw updateError;

      // Send approval email
      await supabase.functions.invoke('send-notification', {
        body: {
          email: submission.email,
          type: 'approved',
          slots: [`${submission.top_left} to ${submission.bottom_right}`],
          adminNotes: reason
        }
      });

    } else if (action === 'reject') {
      // Stripe refund
      if (submission.payment_intent_id) {
        await stripe.refunds.create({ 
          payment_intent: submission.payment_intent_id 
        });
      }

      // Remove storage asset if exists
      if (submission.poster_url) {
        const fileName = submission.poster_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('videos')
            .remove([fileName]);
        }
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq('id', submission_id);

      if (updateError) throw updateError;

      // Send rejection email
      await supabase.functions.invoke('send-notification', {
        body: {
          email: submission.email,
          type: 'rejected',
          slots: [`${submission.top_left} to ${submission.bottom_right}`],
          adminNotes: reason
        }
      });

    } else if (action === 'remove') {
      // Remove occupied slots using the helper function
      await supabase.rpc('free_occupied_slots', { submission_id });

      // Update submission status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          admin_notes: reason || 'Removed by admin'
        })
        .eq('id', submission_id);

      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error managing submission:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
