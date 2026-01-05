import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract client IP from request headers
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  return realIp || 'unknown';
}

// Rate limiting: max 100 requests per IP per hour
async function checkRateLimit(
  supabase: any,
  ip: string,
  endpoint: string,
  maxRequests: number = 100
): Promise<{ allowed: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('rate_limit_requests')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true };
  }

  if (count && count >= maxRequests) {
    return { allowed: false, reason: 'Rate limit exceeded' };
  }

  return { allowed: true };
}

// Log request for rate limiting
async function logRequest(
  supabase: any,
  ip: string,
  endpoint: string,
  email?: string
): Promise<void> {
  await supabase.from('rate_limit_requests').insert({
    ip_address: ip,
    endpoint: endpoint,
    email: email || null,
  });

  if (Math.random() < 0.01) {
    await supabase.rpc('cleanup_old_rate_limit_requests');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limit (max 100 signed URL requests per IP per hour)
    const rateLimitCheck = await checkRateLimit(supabaseAdmin, clientIp, 'get-signed-video-url', 100);
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ 
        error: "Too many requests. Please try again later." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const { filePath, email } = await req.json();

    if (!filePath || !email) {
      return new Response(JSON.stringify({ error: "File path and email are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Log this request for rate limiting
    await logRequest(supabaseAdmin, clientIp, 'get-signed-video-url', email);

    // Hash email to match user_id format (same as create-slot-hold)
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedUserId = hashArray.slice(0, 16)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify user owns this video submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('video_submissions')
      .select('user_id, video_url')
      .eq('video_url', filePath)
      .single();

    if (submissionError || !submission) {
      console.error('Submission not found');
      return new Response(JSON.stringify({ error: "Video not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check ownership by comparing hashed email with submission user_id
    if (submission.user_id !== hashedUserId) {
      console.error('Ownership check failed');
      return new Response(JSON.stringify({ error: "Forbidden - not your video" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Generate signed URL with 5 minute expiry
    const { data, error } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUrl(filePath, 300); // 5 minutes

    if (error) {
      console.error('Signed URL error');
      throw error;
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating signed URL');
    return new Response(JSON.stringify({ error: "Failed to create signed URL" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});