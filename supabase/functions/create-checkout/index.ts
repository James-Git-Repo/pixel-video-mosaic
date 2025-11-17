import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const CreateCheckoutSchema = z.object({
  hold_id: z.string().uuid(),
  email: z.string().email().max(255),
  linked_url: z.string().url().max(2048).optional().or(z.literal('')),
});

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

    const body = await req.json();
    
    // Validate input using Zod schema
    const validation = CreateCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { hold_id, email, linked_url } = validation.data;

    if (!hold_id) {
      return new Response(JSON.stringify({ error: "Missing hold_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate hold exists and matches email
    const { data: hold, error: holdError } = await supabaseClient
      .from('slot_holds')
      .select('*')
      .eq('id', hold_id)
      .eq('email', email)
      .single();

    if (holdError || !hold) {
      return new Response(JSON.stringify({ error: "Hold not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check if hold is expired
    if (new Date(hold.expires_at) <= new Date()) {
      return new Response(JSON.stringify({ error: "Hold has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Get slot count
    const { count: slotCount, error: countError } = await supabaseClient
      .from('slot_hold_items')
      .select('*', { count: 'exact' })
      .eq('hold_id', hold_id);

    if (countError || slotCount === null) {
      return new Response(JSON.stringify({ error: "Failed to count slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://lovable.dev";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Video Slot Purchase (${slotCount} slot${slotCount > 1 ? 's' : ''})`,
              description: `Slots: ${hold.top_left} to ${hold.bottom_right}`,
            },
            unit_amount: 50, // $0.50 in cents
          },
          quantity: slotCount,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment-cancelled`,
      metadata: {
        user_id: hold.user_id || 'anonymous',
        hold_id: hold_id,
        slot_count: slotCount.toString(),
        top_left: hold.top_left,
        bottom_right: hold.bottom_right,
        linked_url: linked_url || '',
        email: email,
      },
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: "required",
    });

    // Save checkout session ID back to hold
    const { error: updateError } = await supabaseClient
      .from('slot_holds')
      .update({ checkout_session_id: session.id })
      .eq('id', hold_id);

    if (updateError) {
      console.error('Error updating hold with session ID:', updateError);
      // Continue anyway, as the session was created successfully
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});