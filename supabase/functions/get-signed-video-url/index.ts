import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { filePath, email } = await req.json();

    if (!filePath || !email) {
      return new Response(JSON.stringify({ error: "File path and email are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Hash email to match user_id format (same as create-slot-hold)
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedUserId = hashArray.slice(0, 16)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Use service role to query submission and verify ownership
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
      console.error('Signed URL error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
