import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  slotIds: string[];
  term: "1y" | "permanent";
  discountCode?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { slotIds, term, discountCode }: CheckoutRequest = await req.json();

    if (!slotIds || slotIds.length === 0) {
      throw new Error("No slots selected");
    }

    // Create service role client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check slot availability and create reservation in a transaction
    const { data: availability, error: availabilityError } = await supabaseService
      .from('slots')
      .select('id, status')
      .in('id', slotIds);

    if (availabilityError) throw availabilityError;

    // Check if any slots are not available
    const unavailableSlots = availability?.filter(slot => slot.status !== 'free') || [];
    if (unavailableSlots.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Some slots are no longer available", 
          unavailableSlots: unavailableSlots.map(s => s.id) 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get pricing
    const { data: pricing, error: pricingError } = await supabaseService
      .from('pricing')
      .select('amount_cents')
      .eq('key', `slot_${term}`)
      .single();

    if (pricingError) throw pricingError;

    let totalAmount = pricing.amount_cents * slotIds.length;

    // Apply discount code
    const isFreeCode = discountCode === "xfgkqwhe9pèàlDòIJ2+QR0EI2";
    if (isFreeCode) {
      totalAmount = 0;
    }

    // Create reservation
    const { data: reservation, error: reservationError } = await supabaseService
      .from('reservations')
      .insert({
        user_id: user.id,
        term,
        slot_count: slotIds.length,
        amount_cents: totalAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (reservationError) throw reservationError;

    // Reserve the slots
    const { error: slotUpdateError } = await supabaseService
      .from('slots')
      .update({
        status: 'reserved',
        reserved_by: reservation.id,
        reserved_expires_at: reservation.expires_at
      })
      .in('id', slotIds);

    if (slotUpdateError) throw slotUpdateError;

    // If using free code, complete the order immediately
    if (isFreeCode) {
      // Update reservation to paid
      await supabaseService
        .from('reservations')
        .update({ status: 'paid' })
        .eq('id', reservation.id);

      // Mark slots as sold
      await supabaseService
        .from('slots')
        .update({
          status: 'sold',
          owner_id: user.id,
          term_end: term === '1y' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
          reserved_by: null,
          reserved_expires_at: null
        })
        .in('id', slotIds);

      // Create order record
      const { data: order } = await supabaseService
        .from('orders')
        .insert({
          user_id: user.id,
          reservation_id: reservation.id,
          slot_count: slotIds.length,
          amount_cents: totalAmount,
          term
        })
        .select()
        .single();

      // Create order_slots records
      const orderSlots = slotIds.map(slotId => ({
        order_id: order.id,
        slot_id: slotId
      }));

      await supabaseService
        .from('order_slots')
        .insert(orderSlots);

      const successUrl = `${req.headers.get("origin")}/payment-success?session_id=free_${reservation.id}`;
      return new Response(
        JSON.stringify({ url: successUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${slotIds.length} Billboard Slot${slotIds.length > 1 ? 's' : ''} — ${term === '1y' ? '1 Year' : 'Permanent'}`,
            },
            unit_amount: pricing.amount_cents,
          },
          quantity: slotIds.length,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      client_reference_id: reservation.id,
      metadata: {
        reservation_id: reservation.id,
        slot_ids: slotIds.join(','),
        user_id: user.id,
        term
      }
    });

    // Update reservation with stripe session id
    await supabaseService
      .from('reservations')
      .update({ stripe_session_id: session.id })
      .eq('id', reservation.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error in create-checkout-session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});