# Supabase Edge Functions — Complete Setup Guide

## Overview

All 55 backend functions have been migrated from Base44 to Supabase Edge Functions.
The code lives in `supabase/functions/` and is ready to deploy.

This guide covers:
1. Installing Supabase CLI
2. Linking your project
3. Setting secrets (Razorpay credentials, etc.)
4. Deploying all functions
5. Verifying everything works

---

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

---

## Step 2: Login & Link Project

```bash
# Login to Supabase
supabase login

# Link to your project (find your project ref in Supabase dashboard → Settings → General)
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Step 3: Set Secrets

Edge Functions read secrets from `Deno.env.get(...)`.
These are NOT the same as Base44 secrets — they must be set in Supabase.

### Quick method — run the setup script:

```bash
chmod +x supabase/setup_secrets.sh
./supabase/setup_secrets.sh
```

### Manual method — set each secret:

```bash
# Supabase built-in (auto-set, but verify)
supabase secrets set SUPABASE_URL=YOUR_SUPABASE_URL
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Razorpay (same values as your Base44 secrets)
supabase secrets set RAZORPAY_KEY_ID=your_razorpay_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Razorpay webhook (create this in Razorpay dashboard → Settings → Webhooks)
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe (if using Stripe — optional)
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Firebase Push (if using push notifications — optional)
supabase secrets set FIREBASE_PROJECT_ID=your_project_id
supabase secrets set FIREBASE_CLIENT_EMAIL=your_client_email
supabase secrets set FIREBASE_PRIVATE_KEY="your_private_key"

# OTP (if using phone OTP — optional)
supabase secrets set OTP_PROVIDER=twilio
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=your_number

# LLM / Gemini (for agentChat — optional)
supabase secrets set GEMINI_API_KEY=your_gemini_key
```

---

## Step 4: Deploy All Functions

```bash
chmod +x supabase/deploy_all.sh
./supabase/deploy_all.sh
```

This deploys all 55 functions with `--no-verify-jwt` (each function handles its own auth).

### Deploy a single function:

```bash
supabase functions deploy createPaymentOrder --no-verify-jwt
supabase functions deploy verifyPayment --no-verify-jwt
```

---

## Step 5: Set Razorpay Webhook URL

In Razorpay dashboard → Settings → Webhooks:
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/handleRazorpayWebhook`
- **Events**: `payment.captured`, `payment.failed`
- **Secret**: Use the same `RAZORPAY_WEBHOOK_SECRET` you set in Step 3

---

## Step 6: Verify

### Check deployed functions:
```bash
supabase functions list
```

### Test payment order creation:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/createPaymentOrder \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"test","pricing_id":"test","check_only":true}'
```

Should return: `{"ok":true,"configured":true}`

### In the app:
1. Go to Your Plan page
2. Click "Upgrade to Pro"
3. Razorpay checkout modal should open
4. Complete test payment
5. Plan should activate automatically

---

## Function Inventory (55 total)

### Payment (4)
- `createPaymentOrder` — Creates Razorpay order
- `verifyPayment` — Verifies payment + activates Pro
- `handleRazorpayWebhook` — Razorpay webhook handler
- `handleStripeWebhook` — Stripe webhook handler

### Auth & Portal (10)
- `sendOtp`, `verifyOtp` — Phone OTP
- `verifyClientPortalAccess`, `getClientPortalData`, `getClientPortalDataByAccess`
- `verifyTeamPortalAccess`, `getTeamPortalData`, `getTeamPortalDataByAccess`
- `enableClientPortalAccess`, `enableTeamPortalAccess`
- `updateClientPortalPassword`, `updateTeamPortalPassword`

### Public Pages (5)
- `getPublicEventData`, `getPublicInvoice`, `getPublicJobSheet`
- `getPublicProfile`, `getPortalData`

### Business Operations (12)
- `createEvent`, `createLead`, `createService`, `createTeamMember`
- `createTeamAssignment`, `createInvoiceFromQuotation`
- `signQuotation`, `clientViewQuotation`, `syncQuotationAcceptance`
- `togglePublicLink`, `toggleInvoicePublicLink`
- `recordPayment`, `recordInvoicePayment`

### Financial (4)
- `editTransaction`, `deleteTransaction`, `voidTransaction`
- `trackStorageUsage`

### Plan Management (5)
- `initWorkspaceSubscription`, `assignProSubscription`
- `downgradeToFree`, `submitUpgradeRequest`
- `getPushConfig`

### Notifications (2)
- `generateNotifications`, `dispatchPushNotification`

### Admin (4)
- `adminDashboardStats`, `adminListWorkspaces`
- `adminGetWorkspaceDetails`, `adminSetWorkspaceStatus`

### WebAuthn (4)
- `generateWebAuthnRegistrationChallenge`, `verifyWebAuthnRegistration`
- `generateWebAuthnAssertionChallenge`, `verifyWebAuthnAssertion`

### Other (5)
- `agentChat` — AI assistant (needs GEMINI_API_KEY)
- `registerPushSubscription` — Push notification registration
- `verifyFirebaseToken` — Firebase token verification
- `getPushConfig` — Push configuration

---

## Troubleshooting

### "Function not found" error
- Function not deployed. Run `./supabase/deploy_all.sh`

### "Payment gateway not configured" error
- Razorpay secrets not set. Run Step 3.

### "Authentication required" error
- Supabase token not being passed. Check `base44Client.js` — it passes the session token automatically.

### Function returns 500
- Check logs: `supabase functions logs <function_name>`

### Credits note
- Supabase Edge Functions are independent of Base44 Integration credits.
- Even when Base44 credits are exhausted, Supabase functions continue to work.
- Only `agentChat` (which calls Gemini) needs its own API key.