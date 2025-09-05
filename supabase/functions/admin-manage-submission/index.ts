// supabase/functions/admin-manage-submission/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.17.0";
import { Resend } from "npm:resend@4.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2022-11-15" });
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Send approval email
async function sendApprovalEmail(email: string, submissionId: string) {
  if (!Deno.env.get("RESEND_API_KEY")) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: "admin@millionslotsai.com",
      to: [email],
      subject: "🌟 Your Work Is Live on the 1 Million Slots AI Billboard!",
      html: `
        <h1>🌟 Congratulations! Your content is now LIVE!</h1>
        
        <p>We're excited to let you know that your AI-generated content has been approved and is now displaying on the Million Slots AI Billboard!</p>
        
        <h2>Your content is live at:</h2>
        <p><a href="https://millionslotsai.com" style="color: #007bff; font-size: 18px; text-decoration: none; background: #f8f9fa; padding: 10px 20px; border-radius: 5px; display: inline-block;">🎯 View Your Content Live</a></p>
        
        <h2>What this means:</h2>
        <ul>
          <li>✅ Your payment has been processed successfully</li>
          <li>🎨 Your AI-generated content is now part of our digital canvas</li>
          <li>🌍 Visible to thousands of visitors worldwide</li>
          <li>📸 Feel free to share screenshots and links!</li>
        </ul>

        <p><strong>Submission ID:</strong> ${submissionId}</p>
        
        <p>Thank you for being part of this innovative AI art experiment! We hope you're thrilled to see your creativity displayed alongside other amazing AI-generated content.</p>

        <p>Questions? Reach out at <a href="mailto:admin@millionslotsai.com">admin@millionslotsai.com</a></p>
        
        <p>Best regards,<br>The Million Slots AI Team</p>
      `,
    });
    console.log(`Approval email sent to ${email}`);
  } catch (error) {
    console.error("Approval email failed:", error);
    throw error;
  }
}

// Send rejection email
async function sendRejectionEmail(email: string, submissionId: string, reason: string) {
  if (!Deno.env.get("RESEND_API_KEY")) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: "admin@millionslotsai.com",
      to: [email],
      subject: "❗Submission Review — Action Required for the 1 Million Slots AI Billboard",
      html: `
        <h1>Submission Review Update</h1>
        
        <p>Thank you for your submission to the Million Slots AI Billboard. After careful review, we're unable to approve your content at this time.</p>
        
        <h2>Reason for rejection:</h2>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Admin Notes:</strong> ${reason}
        </div>

        <h2>Next Steps:</h2>
        <ul>
          <li>💰 <strong>Full Refund:</strong> Your payment has been refunded and will appear in your account within 5-10 business days</li>
          <li>🔄 <strong>Resubmit:</strong> You're welcome to create and submit new AI-generated content that meets our guidelines</li>
          <li>📖 <strong>Review Guidelines:</strong> Check our content policy at <a href="https://millionslotsai.com/content-policy">millionslotsai.com/content-policy</a></li>
        </ul>

        <p><strong>Submission ID:</strong> ${submissionId}</p>
        
        <p>We appreciate your interest in the Million Slots AI Billboard and encourage you to try again with content that meets our AI-generated requirements.</p>

        <p>Questions about this decision? Contact us at <a href="mailto:admin@millionslotsai.com">admin@millionslotsai.com</a></p>
        
        <p>Best regards,<br>The Million Slots AI Team</p>
      `,
    });
    console.log(`Rejection email sent to ${email}`);
  } catch (error) {
    console.error("Rejection email failed:", error);
    throw error;
  }
}

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
    if (action === "approve") {
      // Update submission status
      await adminClient
        .from("video_submissions")
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          admin_notes: reason 
        })
        .eq("id", submission_id);

      // Send approval email
      try {
        await sendApprovalEmail(submission.email, submission_id);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

    } else if (action === "reject") {
      // Process Stripe refund if payment exists
      if (submission.payment_intent_id && submission.payment_intent_id !== 'FREE-CODE') {
        try {
          await stripe.refunds.create({ payment_intent: submission.payment_intent_id });
        } catch (refundError) {
          console.error('Stripe refund failed:', refundError);
        }
      }

      // Update submission status
      await adminClient
        .from("video_submissions")
        .update({ 
          status: 'rejected', 
          rejected_at: new Date().toISOString(),
          admin_notes: reason 
        })
        .eq("id", submission_id);

      // Send rejection email
      try {
        await sendRejectionEmail(submission.email, submission_id, reason);
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

    } else if (action === "remove") {
      // Free occupied slots if content was live
      await adminClient.rpc("free_occupied_slots", { submission_id });
      
      // Update submission status
      await adminClient
        .from("video_submissions")
        .update({ 
          status: 'removed', 
          admin_notes: reason 
        })
        .eq("id", submission_id);

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
