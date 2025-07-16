
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
    const { submissionId, action, adminNotes } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get submission details
    const { data: submission, error: fetchError } = await supabase
      .from('video_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) throw fetchError;

    if (action === 'approve') {
      // Update submission status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Add slots to occupied_slots table
      const occupiedSlotsData = submission.slots.map((slotId: string) => ({
        slot_id: slotId,
        video_url: submission.video_url,
        submission_id: submissionId
      }));

      const { error: slotsError } = await supabase
        .from('occupied_slots')
        .insert(occupiedSlotsData);

      if (slotsError) throw slotsError;

      // Send approval email
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          email: submission.email,
          type: 'approved',
          slots: submission.slots,
          adminNotes: adminNotes
        })
      });

    } else if (action === 'reject') {
      // Update submission status
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Send rejection email
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          email: submission.email,
          type: 'rejected',
          slots: submission.slots,
          adminNotes: adminNotes
        })
      });
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
