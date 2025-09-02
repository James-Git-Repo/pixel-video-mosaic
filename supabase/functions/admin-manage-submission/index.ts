// supabase/functions/admin-manage-submission/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.17.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2022-11-15" });

serve(async (req) => {
  try {
    // 1) Bind caller's JWT to an anon client to evaluate RPC & RLS as the user
    const authz = req.headers.get("Authorization") || "";
    if (!authz.toLowerCase().startsWith("bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authz } },
    });

    // 2) Server-side admin verification (DB-backed, no localStorage / hardcoded password)
    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
    if (adminErr) return new Response("Auth check failed", { status: 401 });
    if (!isAdmin) return new Response("Forbidden", { status: 403 });

    // 3) Use service-role **after** admin verified
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 4) Parse input
    const { action, submission_id, reason } = await req.json();

    // 5) Fetch submission with service role (internal)
    const { data: submission, error: subErr } = await adminClient
      .from("video_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();
    if (subErr || !submission) return new Response("Not found", { status: 404 });

    // 6) Branch by action (approve / reject / remove)
    // NOTE: reuse your existing logic here; keep Stripe refund as-is.
    // Example skeleton:
    if (action === "approve") {
      // insert into occupied_slots + occupied_slot_items, set status approved, send email...
    } else if (action === "reject") {
      await stripe.refunds.create({ payment_intent: submission.payment_intent_id });
      // set status rejected, delete storage file, send email...
    } else if (action === "remove") {
      // call free_occupied_slots(submission_id), mark rejected with note...
      await adminClient.rpc("free_occupied_slots", { submission_id });
    } else {
      return new Response("Invalid action", { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
});
