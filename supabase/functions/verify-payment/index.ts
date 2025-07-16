
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    const { sessionId, submissionId } = await req.json();

    const stripe = new Stripe(Deno.env.get("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") || "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the payment session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === "paid") {
      // Get submission details for the email
      const { data: submission, error: submissionError } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;

      // Update submission status to under_review
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({ 
          status: 'under_review',
          payment_intent_id: session.payment_intent as string
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Send thank you email
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            email: submission.email,
            type: 'payment_confirmation',
            slots: submission.slots,
            amount: submission.amount_paid / 100 // Convert cents to dollars
          }
        });
        console.log('Thank you email sent successfully');
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError);
        // Don't fail the payment verification if email fails
      }

      return new Response(JSON.stringify({ success: true, status: 'paid' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
