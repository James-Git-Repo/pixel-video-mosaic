import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function should only be called by other edge functions or with service role key
// Verify the authorization header contains a valid service role key or internal token
function verifyServiceAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  // Check if it's being called with service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  // Also allow calls from Supabase internal functions (they use a different auth pattern)
  // Check if the request has the apikey header matching service role
  const apiKey = req.headers.get('apikey');
  if (apiKey === serviceRoleKey) {
    return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify this request is from an authorized source (service role only)
  if (!verifyServiceAuth(req)) {
    console.error('Unauthorized request to send-notification');
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  // HTML escape helper to prevent injection
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  try {
    const { email, type, slots, adminNotes, amount } = await req.json();

    // Validate required fields
    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let subject, html;

    if (type === 'payment_confirmation') {
      subject = "🎉 Payment Confirmed - Your Video Submission is Under Review!";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Thank you for your payment!</h1>
          <p>We've successfully received your payment of <strong>$${escapeHtml(String(amount))}</strong> for slots <strong>${escapeHtml(Array.isArray(slots) ? slots.join(', ') : String(slots))}</strong> on the Million Slots AI Billboard.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e40af;">What happens next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Your video is now under review by our team</li>
              <li>We'll check that it meets our community guidelines</li>
              <li>You'll receive an email notification once the review is complete</li>
              <li>If approved, your video will go live on the billboard immediately</li>
              <li>If rejected, you'll receive a full refund within 5-7 business days</li>
            </ul>
          </div>
          
          <p>The review process typically takes 24-48 hours. We appreciate your patience!</p>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Million Slots AI Billboard Team</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message from Million Slots AI Billboard.</p>
        </div>
      `;
    } else if (type === 'approved') {
      subject = "🎉 Your video submission has been approved!";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Great news! Your video is now live!</h1>
          <p>Your video submission for slots <strong>${escapeHtml(Array.isArray(slots) ? slots.join(', ') : String(slots))}</strong> has been approved and is now live on the Million Slots AI Billboard.</p>
          <p>You can view your video at: <a href="https://your-domain.com">Million Slots AI Billboard</a></p>
          <p>Thank you for being part of our digital canvas!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message from Million Slots AI Billboard.</p>
        </div>
      `;
    } else if (type === 'rejected') {
      subject = "❌ Your video submission was not approved";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Video submission not approved</h1>
          <p>Unfortunately, your video submission for slots <strong>${escapeHtml(Array.isArray(slots) ? slots.join(', ') : String(slots))}</strong> was not approved for the following reason:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; font-style: italic;">${escapeHtml(adminNotes) || 'Content did not meet our community guidelines.'}</p>
          </div>
          <p>Your payment will be refunded within 5-7 business days.</p>
          <p>If you have any questions, please feel free to reach out to our support team.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message from Million Slots AI Billboard.</p>
        </div>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "Million Slots AI Billboard <notifications@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log('Notification sent successfully to:', email);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error sending notification");
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});