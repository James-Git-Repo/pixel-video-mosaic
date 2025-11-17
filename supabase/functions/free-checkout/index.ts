// supabase/functions/free-checkout/index.ts
// TESTING: POST with { email, slots, promo_code } → creates free submission
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const FreeCheckoutSchema = z.object({
  email: z.string().email().max(255),
  hold_id: z.string().uuid(),
  promo_code: z.string().min(1).max(100),
  linked_url: z.string().url().max(2048).optional().or(z.literal('')),
});

// Use constant-time comparison for security
const VALID_PROMO_CODE = Deno.env.get("PROMO_CODE_FREE") || "";

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Extract client IP from request headers
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  return realIp || 'unknown';
}

// Check rate limiting for promo code attempts
async function checkRateLimit(
  supabase: any,
  ip: string,
  email: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check failed attempts by IP (max 5 per hour)
  const { count: ipAttempts, error: ipError } = await supabase
    .from('promo_code_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('attempted_at', oneHourAgo);

  if (ipError) throw ipError;
  if (ipAttempts && ipAttempts >= 5) {
    return { allowed: false, reason: 'IP rate limit exceeded' };
  }

  // Check failed attempts by email (max 3 per hour)
  const { count: emailAttempts, error: emailError } = await supabase
    .from('promo_code_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', oneHourAgo);

  if (emailError) throw emailError;
  if (emailAttempts && emailAttempts >= 3) {
    return { allowed: false, reason: 'Email rate limit exceeded' };
  }

  return { allowed: true };
}

// Log promo code attempt
async function logPromoAttempt(
  supabase: any,
  ip: string,
  email: string,
  success: boolean
): Promise<void> {
  await supabase.from('promo_code_attempts').insert({
    ip_address: ip,
    email: email,
    success: success,
  });

  // Cleanup old records on successful attempt
  if (success) {
    await supabase.rpc('cleanup_old_promo_attempts');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    
    // Validate input using Zod schema
    const validation = FreeCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { email, hold_id, promo_code, linked_url } = validation.data;

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(adminClient, clientIp, email);
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}, reason: ${rateLimitCheck.reason}`);
      
      // Log blocked attempt (doesn't count toward limit)
      await logPromoAttempt(adminClient, clientIp, email, false);
      
      return new Response(JSON.stringify({ 
        error: "Too many attempts. Please try again later." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Validate promo code with constant-time comparison
    const isValidPromo = VALID_PROMO_CODE && constantTimeCompare(promo_code, VALID_PROMO_CODE);

    // Log attempt
    await logPromoAttempt(adminClient, clientIp, email, isValidPromo);

    if (!isValidPromo) {
      console.log('Invalid promo code attempt');
      return new Response(JSON.stringify({ error: "Invalid promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify hold exists and matches email
    const { data: hold, error: holdError } = await adminClient
      .from('slot_holds')
      .select('*')
      .eq('id', hold_id)
      .eq('email', email)
      .single();

    if (holdError || !hold) {
      return new Response(JSON.stringify({ error: "Invalid or expired slot hold" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Count slots for this hold
    const { count: slotCount, error: countError } = await adminClient
      .from('slot_hold_items')
      .select('*', { count: 'exact' })
      .eq('hold_id', hold_id);

    if (countError || slotCount === null) {
      return new Response(JSON.stringify({ error: "Failed to verify slots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Build slots JSON array
    const { data: slotItems } = await adminClient
      .from('slot_hold_items')
      .select('slot_id')
      .eq('hold_id', hold_id);

    const slotsJson = slotItems?.map(item => item.slot_id) || [];

    // Generate anonymous user ID from email
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const anonymousUserId = hashArray.slice(0, 16)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create free video submission
    const { data: submission, error: submissionError } = await adminClient
      .from('video_submissions')
      .insert({
        user_id: anonymousUserId,
        email: email,
        top_left: hold.top_left,
        bottom_right: hold.bottom_right,
        slots: slotsJson,
        amount_cents: 0,
        amount_paid: 0,
        currency: 'usd',
        payment_intent_id: 'FREE-CODE',
        status: 'pending_payment',
        linked_url: linked_url || null,
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Failed to create free submission:', submissionError);
      return new Response(JSON.stringify({ error: "Failed to create submission" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Delete hold atomically
    await adminClient.from('slot_hold_items').delete().eq('hold_id', hold_id);
    await adminClient.from('slot_holds').delete().eq('id', hold_id);

    console.log(`Free checkout completed: ${submission.id} for ${slotCount} slots`);

    return new Response(JSON.stringify({ 
      ok: true,
      submission_id: submission.id,
      free_checkout: true,
      slot_count: slotCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Free checkout failed');
    return new Response(JSON.stringify({ error: "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});