# Environment Setup Checklist

## Required Supabase Environment Variables

Go to [Supabase Dashboard → Project Settings → Functions → Environment Variables](https://supabase.com/dashboard/project/awgqhfaojevudjkhfibw/settings/functions) and ensure these are set:

### Core Variables
- `SUPABASE_URL` = `https://awgqhfaojevudjkhfibw.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Z3FoZmFvamV2dWRqa2hmaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgzOTUsImV4cCI6MjA2ODE4NDM5NX0.kp_vJp-0weGEhC1dlavmpTrr3joCBaXvjoa59sbmcAc`
- `SUPABASE_SERVICE_ROLE_KEY` = [Your service role key]

### Payment Processing
- `STRIPE_SECRET_KEY` = [Your Stripe secret key - starts with sk_live_ or sk_test_]

### Email Service
- `RESEND_API_KEY` = [Your Resend API key - get from https://resend.com/api-keys]
- `RESEND_FROM` = `admin@millionslotsai.com`

## Verification Steps

### 1. Stripe Setup
- Ensure your Stripe account has Express Dashboard enabled
- Connect a bank account for payouts via Stripe Dashboard
- Verify webhook endpoints are configured if needed

### 2. Resend Setup
- Sign up at https://resend.com if you haven't already
- Verify your domain `millionslotsai.com` at https://resend.com/domains
- Create API key at https://resend.com/api-keys
- Ensure the from address `admin@millionslotsai.com` is verified

### 3. Database Verification
Run this query in Supabase SQL Editor to verify admin setup:
```sql
-- Check if user_roles table exists and has proper structure
SELECT * FROM public.user_roles LIMIT 1;

-- Test admin function
SELECT public.is_admin();
```

### 4. Function Testing
All edge functions are now configured in `supabase/config.toml`:
- `admin-cashout` (requires auth)
- `admin-change-password` (requires auth) 
- `free-checkout` (requires auth)
- `verify-payment` (public)
- `admin-manage-submission` (requires auth)

## Quick Feature Test Checklist

✅ **Admin Panel Access**: Visit `/admin` (must be logged in as admin)  
✅ **Stripe Payouts**: Click "Refresh Balance" in admin panel  
✅ **Password Change**: Use admin password change form  
✅ **Free Checkout**: Enter code `xfgkqwhe9pèàlDòIJ2+QR0EI2` during purchase  
✅ **Email Delivery**: Complete a purchase and check email delivery  
✅ **Policy Pages**: Verify readable text on white backgrounds  

## Troubleshooting

### Common Issues:
1. **"No bank account configured"** → Set up Express Dashboard in Stripe
2. **Email delivery fails** → Verify domain and from address in Resend
3. **Admin functions fail** → Check `user_roles` table and `is_admin()` function
4. **Function timeout** → Check environment variables are set correctly

### Support:
All support emails should now go to: `admin@millionslotsai.com`