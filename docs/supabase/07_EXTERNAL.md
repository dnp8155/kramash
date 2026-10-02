# 07 — External APIs, Webhooks & Scheduled Jobs

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 19. External APIs

### Payment Gateways

#### Razorpay

| Property | Value |
|----------|-------|
| Base URL | `https://api.razorpay.com/v1` |
| Auth | Basic Auth (`key_id:key_secret`) |
| Endpoints | `POST /orders` (create order), `GET /payments/{id}` (verify) |
| Env Vars | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Used By | `createPaymentOrder`, `verifyPayment`, `handleRazorpayWebhook` |
| Webhook | `payment.captured` → activate Pro |

#### Stripe

| Property | Value |
|----------|-------|
| Base URL | `https://api.stripe.com/v1` |
| Auth | Bearer token (`STRIPE_SECRET_KEY`) |
| Endpoints | `GET /checkout/sessions/{id}` (verify), `GET /payment_intents/{id}` (verify) |
| Env Vars | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Used By | `handleStripeWebhook` |
| Webhook | `checkout.session.completed` → activate Pro |

### LLM API

| Property | Value |
|----------|-------|
| Provider | Base44 Core InvokeLLM (abstracts multiple providers) |
| Models | automatic, gpt_5_mini, gemini_3_flash, gpt_5_4, claude_sonnet_4_6, etc. |
| Used By | `agentChat` (workspace AI assistant) |
| Env Vars | None (managed by Base44 platform) |
| Target | Direct API calls to OpenAI/Anthropic/Google from Edge Function |

### OTP Provider

| Property | Value |
|----------|-------|
| Provider | MSG91 / Twilio Verify / Firebase (configurable) |
| Env Vars | `OTP_PROVIDER_API_KEY`, `OTP_PROVIDER` |
| Used By | `sendOtp`, `verifyOtp` |
| Status | Pending credentials — returns 503 if not configured |

### Firebase Phone Auth

| Property | Value |
|----------|-------|
| API | Google Identity Toolkit REST API |
| Endpoint | `POST https://identitytoolkit.googleapis.com/v1/accounts:lookup` |
| Auth | Firebase Web API key (public by design) |
| Used By | `verifyFirebaseToken` |
| Status | Session creation pending (Base44 doesn't support phone-auth session) |

---

## 20. Webhooks

### Stripe Webhook

| Property | Value |
|----------|-------|
| Endpoint | `/functions/handleStripeWebhook` |
| Method | POST |
| Auth | Stripe signature verification (HMAC-SHA256) |
| Events | `checkout.session.completed` |
| Processing | Verify signature → find SubscriptionPayment → check idempotency → activate Pro |
| Idempotency | Skip if `payment.status === 'SUCCESS'` |
| Env Vars | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

### Razorpay Webhook

| Property | Value |
|----------|-------|
| Endpoint | `/functions/handleRazorpayWebhook` |
| Method | POST |
| Auth | Razorpay signature verification (HMAC-SHA256) |
| Events | `payment.captured` |
| Processing | Verify signature → find SubscriptionPayment by order_id → check idempotency → activate Pro |
| Idempotency | Skip if `payment.status === 'SUCCESS'` |
| Env Vars | `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |

### Signature Verification

Both webhooks use timing-safe comparison:

```typescript
const expected = Buffer.from(expectedSignature, "utf8");
const actual = Buffer.from(actualSignature, "utf8");
if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
  throw new Error("Signature verification failed");
}
```

Stripe also enforces a 5-minute replay protection window (rejects stale timestamps).

---

## 21. Cron / Scheduled Jobs

### Current State

No scheduled jobs are currently implemented. The `generateNotifications` function is called on-demand from the frontend on app load.

### PROPOSED Scheduled Jobs

| Job Name | Frequency | Purpose | Function | Tables Used |
|----------|-----------|---------|----------|-------------|
| `generate-notifications` | Every 1 hour | Scan for upcoming events + subscription expiry | `generateNotifications` | events, workspace_subscriptions, workspace_members, notifications, users |
| `check-subscription-expiry` | Daily at 00:00 | Check for expired Pro subscriptions, downgrade to Free | PROPOSED | workspace_subscriptions, workspaces |
| `cleanup-expired-quotations` | Daily at 00:00 | Mark quotations past `valid_until` as expired | PROPOSED | quotations |
| `send-event-reminders` | Every 30 min | Send email reminders for events in 24/48 hours | PROPOSED | events, event_reminders, workspace_members, users |

### Supabase Implementation

Use `pg_cron` extension or Supabase's scheduled Edge Functions:

```sql
-- Example: schedule notification generation
SELECT cron.schedule(
  'generate-notifications',
  '0 * * * *',  -- every hour
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-notifications-cron',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )$$
);
``