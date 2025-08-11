
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle webhook events
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event;
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Handle direct verification calls for development
      const { sessionId } = JSON.parse(body);
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing session ID" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return new Response(JSON.stringify({ 
        success: session.payment_status === "paid", 
        status: session.payment_status 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process webhook event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      if (session.payment_status === "paid") {
        const { user_id, hold_id, slot_count } = session.metadata;
        
        if (!hold_id) {
          console.error('No hold_id in session metadata');
          return new Response(null, { status: 200 });
        }

        // Get hold details
        const { data: hold, error: holdError } = await supabase
          .from('slot_holds')
          .select('*')
          .eq('id', hold_id)
          .single();

        if (holdError || !hold) {
          console.error('Hold not found or expired:', hold_id);
          return new Response(null, { status: 200 }); // Don't retry
        }

        // Recompute slot count server-side for security
        const { count: actualSlotCount, error: countError } = await supabase
          .from('slot_hold_items')
          .select('*', { count: 'exact' })
          .eq('hold_id', hold_id);

        if (countError || actualSlotCount === null) {
          console.error('Failed to count slots for hold:', hold_id);
          return new Response(null, { status: 200 });
        }

        // Create video submission
        const { data: submission, error: submissionError } = await supabase
          .from('video_submissions')
          .insert({
            user_id: user_id,
            email: session.customer_details?.email || 'unknown@example.com',
            top_left: hold.top_left,
            bottom_right: hold.bottom_right,
            width: hold.bottom_right.split('-')[1] - hold.top_left.split('-')[1] + 1,
            height: hold.bottom_right.split('-')[0] - hold.top_left.split('-')[0] + 1,
            amount_cents: actualSlotCount * 50,
            currency: 'USD',
            payment_intent_id: session.payment_intent,
            status: 'paid'
          })
          .select()
          .single();

        if (submissionError) {
          console.error('Failed to create submission:', submissionError);
          return new Response(null, { status: 500 });
        }

        // Delete hold atomically (items first, then hold)
        await supabase.from('slot_hold_items').delete().eq('hold_id', hold_id);
        await supabase.from('slot_holds').delete().eq('id', hold_id);

        console.log(`Payment processed successfully for hold ${hold_id}, submission ${submission.id}`);
      }
    }

    return new Response(null, { status: 200 });

  } catch (error) {
    console.error('Error in verify-payment webhook:', error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
