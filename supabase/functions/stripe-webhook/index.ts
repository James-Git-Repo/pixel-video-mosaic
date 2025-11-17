import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      console.error('Webhook validation failed:', { 
        hasSignature: !!signature, 
        hasSecret: !!webhookSecret 
      });
      return new Response(
        JSON.stringify({ error: "Invalid webhook request" }), 
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: "Invalid webhook request" }), 
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create service role client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Received webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.client_reference_id;
        const metadata = session.metadata;

        if (!reservationId || !metadata) {
          throw new Error("Missing reservation ID or metadata");
        }

        const slotIds = metadata.slot_ids.split(',');
        const userId = metadata.user_id;
        const term = metadata.term as "1y" | "permanent";

        console.log(`Processing payment completion for reservation ${reservationId}`);

        // Update reservation status
        const { error: reservationError } = await supabase
          .from('reservations')
          .update({ status: 'paid' })
          .eq('id', reservationId);

        if (reservationError) throw reservationError;

        // Calculate term end date
        const termEnd = term === '1y' 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        // Mark slots as sold
        const { error: slotsError } = await supabase
          .from('slots')
          .update({
            status: 'sold',
            owner_id: userId,
            term_end: termEnd,
            reserved_by: null,
            reserved_expires_at: null
          })
          .in('id', slotIds);

        if (slotsError) throw slotsError;

        // Create order record
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            reservation_id: reservationId,
            slot_count: slotIds.length,
            amount_cents: session.amount_total || 0,
            term
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order_slots records
        const orderSlots = slotIds.map(slotId => ({
          order_id: order.id,
          slot_id: slotId
        }));

        const { error: orderSlotsError } = await supabase
          .from('order_slots')
          .insert(orderSlots);

        if (orderSlotsError) throw orderSlotsError;

        console.log(`Successfully processed payment for ${slotIds.length} slots`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.client_reference_id;

        if (reservationId) {
          console.log(`Processing expired session for reservation ${reservationId}`);

          // Update reservation status
          await supabase
            .from('reservations')
            .update({ status: 'expired' })
            .eq('id', reservationId);

          // Free up the slots
          await supabase
            .from('slots')
            .update({
              status: 'free',
              reserved_by: null,
              reserved_expires_at: null
            })
            .eq('reserved_by', reservationId);

          console.log(`Freed slots for expired reservation ${reservationId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});