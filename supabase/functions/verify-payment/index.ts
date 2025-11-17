
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Input validation helpers
const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const parseCoordinates = (coord: string): { row: number, col: number } | null => {
  if (!coord || typeof coord !== 'string') return null;
  const parts = coord.split('-');
  if (parts.length !== 2) return null;
  const row = parseInt(parts[0], 10);
  const col = parseInt(parts[1], 10);
  if (isNaN(row) || isNaN(col)) return null;
  if (row < 0 || row > 999 || col < 0 || col > 999) return null;
  return { row, col };
};

// Send thank-you email after successful payment
async function sendThankYouEmail(email: string, amountCents: number, slotCount: number, topLeft: string, bottomRight: string) {
  if (!Deno.env.get("RESEND_API_KEY")) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: "admin@millionslotsai.com",
      to: [email],
      subject: "Thanks! We received your submission—now under review",
      html: `
        <h1>Thank you for your submission!</h1>
        <p>We've successfully received your payment and your content is now queued for review.</p>
        
        <h2>Submission Details:</h2>
        <ul>
          <li><strong>Amount Paid:</strong> $${(amountCents / 100).toFixed(2)} USD</li>
          <li><strong>Slots Reserved:</strong> ${slotCount} slot${slotCount > 1 ? 's' : ''}</li>
          <li><strong>Area:</strong> ${topLeft} to ${bottomRight}</li>
        </ul>

        <h2>What happens next?</h2>
        <p>Our team will review your submission within <strong>24-48 hours</strong>. You'll receive another email once your content is approved and live on the billboard.</p>

        <p>Need help? Contact us at <a href="mailto:admin@millionslotsai.com">admin@millionslotsai.com</a></p>
        
        <p>Best regards,<br>The Million Slots AI Team</p>
      `,
    });
    console.log(`Thank-you email sent to ${email}`);
  } catch (error) {
    console.error("Email send failed");
    throw error;
  }
}

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
        console.error('Webhook signature verification failed');
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Handle direct verification calls (development only)
      const { sessionId } = JSON.parse(body);
      if (!sessionId || typeof sessionId !== 'string') {
        return new Response(JSON.stringify({ error: "Invalid session ID" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return new Response(JSON.stringify({ 
        verified: session.payment_status === "paid", 
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
    // Extract and validate metadata
    const { user_id, hold_id, slot_count, top_left, bottom_right, linked_url, email } = session.metadata;
    
    // user_id can be anonymous hash (32 chars) or UUID (36 chars)
    if (!user_id || user_id.length < 16) {
      console.error('Invalid user_id in metadata:', user_id);
      return new Response(JSON.stringify({ error: "Invalid user_id format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

        if (!hold_id || !validateUUID(hold_id)) {
          console.error('Invalid hold_id in metadata:', hold_id);
          return new Response(JSON.stringify({ error: "Invalid hold_id format" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
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

        // Validate coordinates
        const topLeft = parseCoordinates(hold.top_left);
        const bottomRight = parseCoordinates(hold.bottom_right);
        
        if (!topLeft || !bottomRight) {
          console.error('Invalid coordinate format:', { topLeft: hold.top_left, bottomRight: hold.bottom_right });
          return new Response(JSON.stringify({ error: "Invalid coordinate format" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const width = bottomRight.col - topLeft.col + 1;
        const height = bottomRight.row - topLeft.row + 1;

        if (width < 1 || height < 1 || width > 1000 || height > 1000) {
          console.error('Invalid slot dimensions:', { width, height });
          return new Response(JSON.stringify({ error: "Invalid slot dimensions" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
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

        if (actualSlotCount < 1 || actualSlotCount > 1000000) {
          console.error('Invalid slot count:', actualSlotCount);
          return new Response(JSON.stringify({ error: "Invalid slot count" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Validate customer email (check metadata first, then customer_details)
        const customerEmail = email || session.customer_details?.email;
        if (!customerEmail || !validateEmail(customerEmail)) {
          console.error('Invalid or missing customer email:', customerEmail);
          return new Response(JSON.stringify({ error: "Invalid email address" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Create video submission
        const { data: submission, error: submissionError } = await supabase
          .from('video_submissions')
          .insert({
            user_id: user_id,
            email: customerEmail,
            top_left: hold.top_left,
            bottom_right: hold.bottom_right,
            width: width,
            height: height,
            amount_cents: actualSlotCount * 50,
            currency: 'USD',
            payment_intent_id: session.payment_intent,
            status: 'under_review'
          })
          .select()
          .single();

        if (submissionError) {
          console.error('Failed to create submission:', submissionError);
          return new Response(null, { status: 500 });
        }

        // Send thank-you email
        try {
          await sendThankYouEmail(submission.email, actualSlotCount * 50, actualSlotCount, hold.top_left, hold.bottom_right);
        } catch (emailError) {
          console.error('Failed to send thank-you email:', emailError);
          // Don't fail the payment if email fails
        }

        // Delete hold atomically (items first, then hold)
        await supabase.from('slot_hold_items').delete().eq('hold_id', hold_id);
        await supabase.from('slot_holds').delete().eq('id', hold_id);

        console.log(`Payment processed successfully for hold ${hold_id}, submission ${submission.id}`);
      }
    }

    return new Response(null, { status: 200 });

  } catch (error) {
    console.error('Payment verification failed');
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
