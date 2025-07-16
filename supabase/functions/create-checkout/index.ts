
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
    const { slots, email, videoUrl, videoFilename, submissionId } = await req.json();

    const stripe = new Stripe(Deno.env.get("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") || "", {
      apiVersion: "2023-10-16",
    });

    const totalAmount = slots.length * 200; // $2.00 per slot in cents

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Video Slot Purchase (${slots.length} slot${slots.length > 1 ? 's' : ''})`,
              description: `Slots: ${slots.join(', ')}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submissionId}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled?submission_id=${submissionId}`,
      metadata: {
        submission_id: submissionId,
        slots: JSON.stringify(slots),
        email: email,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
