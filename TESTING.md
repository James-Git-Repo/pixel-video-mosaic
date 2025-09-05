# How to Test the 5 New Features

## 1. Admin Cash Out Flow

**Admin Panel Access**: Visit `/admin` as an admin user (requires proper `user_roles` setup)

**Happy Path**:
- Click "Refresh Balance" → Should show Stripe balance (available/pending)
- Enter amount in USD (e.g., "5.00") → Click "Payout Now"
- Should show success toast with payout ID

**Failure Cases**:
- No bank account configured → Shows helpful error message
- Insufficient funds → Shows available balance in error
- Invalid amount → Shows validation error

## 2. Admin Password Change

**Location**: Admin Panel → "Account Security" section

**Happy Path**:
- Enter "BananaTua23" in both password fields → Click "Update"
- Should show success message
- Log out and log back in with new password

**Failure Cases**:
- Password mismatch → Shows error
- Password < 8 chars → Shows validation error
- Non-admin user → Gets 403 Forbidden

## 3. Improved Text Legibility

**Pages to Check**: `/content-policy`, `/terms`, `/refund-policy`

**What to Verify**:
- All white/colored background boxes now use `text-slate-800` (dark readable text)
- No neon pink text remains in content areas
- All email references point to `admin@millionslotsai.com`
- Text has sufficient contrast on white backgrounds

## 4. Transactional Emails

**Email Types**:

1. **Thank-You Email** (after payment):
   - Trigger: Complete Stripe checkout
   - Subject: "Thanks! We received your submission—now under review"
   - Contains: Amount, slot count, 24-48h timeline

2. **Approval Email** (admin approves):
   - Trigger: Admin clicks "Approve" in admin panel
   - Subject: "🌟 Your Work Is Live on the 1 Million Slots AI Billboard!"
   - Contains: Congratulations, live link, submission ID

3. **Rejection Email** (admin rejects):
   - Trigger: Admin clicks "Reject & Refund"
   - Subject: "❗Submission Review — Action Required..."
   - Contains: Reason, refund info, resubmission encouragement

**Testing**: 
- All emails send from `admin@millionslotsai.com`
- Email failures are logged but don't block main flow
- Check console logs for delivery status

## 5. Discount Code Feature

**Code**: `xfgkqwhe9pèàlDòIJ2+QR0EI2` (exact match required)

**Happy Path**:
- Select slots → Enter valid promo code → See "Total: FREE"
- Click "Submit Free with Promo Code" → Skips Stripe
- Creates submission with `amount_cents=0`, `payment_intent_id='FREE-CODE'`
- Status becomes `under_review` immediately

**Failure Cases**:
- Wrong code → Normal Stripe flow (no error shown)
- Invalid/expired slots → Shows slot error
- Authentication required → 401 error

**Security Features**:
- Server-side constant-time comparison
- All attempts logged
- Code must match exactly (case-sensitive, special chars)

## Required Environment Variables

Ensure these are set in Supabase Functions → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM=admin@millionslotsai.com`

## Admin Walkthrough

**View Balance & Trigger Payout**: Admin Panel → Account Security → Stripe Payouts
**Change Password**: Admin Panel → Account Security → Change Password  
**Discount Code Entry**: Any slot purchase → "Have a promo code?" field
**Email Triggers**: All automatic - check logs in Supabase Functions for delivery status