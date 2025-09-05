// supabase/functions/admin-cashout/index.ts
// TESTING: GET /admin-cashout?mode=balance → returns Stripe balance
// TESTING: POST /admin-cashout with { amount_cents, currency } → creates payout
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Verify admin via JWT + RPC (no localStorage tricks)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Handle balance check
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("mode");
      
      if (mode === "balance") {
        try {
          const balance = await stripe.balance.retrieve();
          return new Response(JSON.stringify({ 
            available: balance.available,
            pending: balance.pending 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ 
            error: error.message || "Failed to retrieve balance" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
      }
    }

    // Handle payout creation
    if (req.method === "POST") {
      const { amount_cents, currency = "usd" } = await req.json();
      
      if (!amount_cents || amount_cents <= 0) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      try {
        // Check available balance first
        const balance = await stripe.balance.retrieve();
        const availableAmount = balance.available.find(b => b.currency === currency)?.amount || 0;
        
        if (amount_cents > availableAmount) {
          return new Response(JSON.stringify({ 
            error: `Insufficient funds. Available: $${(availableAmount / 100).toFixed(2)}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Create payout
        const payout = await stripe.payouts.create({
          amount: amount_cents,
          currency: currency,
        });

        console.log(`Admin payout created: ${payout.id} for $${(amount_cents / 100).toFixed(2)}`);

        return new Response(JSON.stringify({ 
          success: true,
          payout_id: payout.id,
          amount: amount_cents,
          currency: currency
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (error: any) {
        console.error("Payout failed:", error);
        return new Response(JSON.stringify({ 
          error: error.message || "Payout failed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    console.error("Error in admin-cashout:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});