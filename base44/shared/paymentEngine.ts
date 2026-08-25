// Shared payment engine for subscription payment verification and Pro activation.
// Used by verifyPayment and handleStripeWebhook to avoid duplicate logic.

import crypto from "node:crypto";
import { computeExpiry, PLAN_CODES, SUB_STATUS } from "./planEngine.ts";

// Verify a Stripe webhook signature (HMAC-SHA256).
// Stripe-Signature header format: "t=TIMESTAMP,v1=HEX_SIGNATURE"
// Returns the parsed event payload on success; throws on any failure.
export function verifyStripeSignature(rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) {
  if (!signatureHeader || !webhookSecret) {
    throw new Error("Missing Stripe signature or webhook secret");
  }

  const parts = {};
  for (const item of signatureHeader.split(",")) {
    const [key, ...rest] = item.split("=");
    parts[key] = rest.join("=");
  }

  if (!parts.t || !parts.v1) {
    throw new Error("Invalid Stripe-Signature header format");
  }

  const timestamp = parseInt(parts.t, 10);
  if (isNaN(timestamp)) {
    throw new Error("Invalid timestamp in Stripe signature");
  }

  // Replay protection: reject stale signatures.
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > toleranceSeconds) {
    throw new Error("Stripe signature timestamp outside tolerance window");
  }

  // Compute expected HMAC-SHA256 signature.
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  // Timing-safe comparison.
  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(parts.v1, "utf8");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Stripe signature verification failed");
  }

  return JSON.parse(rawBody);
}

// Activate Pro subscription after verified payment.
// Idempotent: if a SUCCESS payment already activated a subscription, skip.
export async function activateProFromPayment(base44, payment, pricing, proPlan) {
  // Idempotency: check if this payment already activated a subscription.
  if (payment.status === "SUCCESS" && payment.subscription_id) {
    return { ok: true, alreadyActivated: true, subscription_id: payment.subscription_id };
  }

  const startDate = new Date().toISOString().split("T")[0];
  const expiresAt = computeExpiry(startDate, pricing.duration_months || 1);

  // Cancel existing ACTIVE subscription (preserves history).
  const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({
    workspace_id: payment.workspace_id,
    status: SUB_STATUS.ACTIVE
  });
  for (const s of existing || []) {
    await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
      status: SUB_STATUS.CANCELLED,
      note: "Replaced by payment gateway activation"
    });
  }

  // Create new ACTIVE Pro subscription.
  const sub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
    workspace_id: payment.workspace_id,
    plan_id: proPlan.id,
    pricing_id: pricing.id,
    status: SUB_STATUS.ACTIVE,
    started_at: startDate,
    expires_at: expiresAt,
    auto_renew: false,
    source: "PAYMENT_GATEWAY",
    assigned_price: pricing.price,
    billing_cycle_snapshot: pricing.billing_cycle,
    updated_by: "payment_gateway",
    note: `Activated via ${payment.gateway} payment`
  });

  // Update workspace plan fields.
  await base44.asServiceRole.entities.Workspace.update(payment.workspace_id, {
    plan_type: "pro",
    plan_status: "active"
  });

  // Mark payment as SUCCESS and link subscription.
  await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
    status: "SUCCESS",
    subscription_id: sub.id,
    verified_at: new Date().toISOString()
  });

  return { ok: true, subscription_id: sub.id, expires_at: expiresAt };
}

// Mark a payment as failed.
export async function markPaymentFailed(base44, paymentId, reason) {
  await base44.asServiceRole.entities.SubscriptionPayment.update(paymentId, {
    status: "FAILED",
    failure_reason: reason,
    verified_at: new Date().toISOString()
  });
}

// Verify a Stripe Checkout Session by retrieving it from the Stripe API.
export async function verifyStripeSession(sessionId, secretKey) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe API error: ${err}`);
  }
  return await res.json();
}

// Verify a Stripe Payment Intent (for webhook payment_intent.succeeded).
export async function verifyStripePaymentIntent(paymentIntentId, secretKey) {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe API error: ${err}`);
  }
  return await res.json();
}

// Verify a Razorpay payment signature.
// Razorpay generates: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
export function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  if (!orderId || !paymentId || !signature || !keySecret) {
    throw new Error("Missing Razorpay signature parameters");
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Razorpay signature verification failed");
  }
  return true;
}

// Fetch a Razorpay payment by ID (to verify status server-side).
export async function verifyRazorpayPayment(paymentId, keyId, keySecret) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay API error: ${err}`);
  }
  return await res.json();
}

// Verify a Razorpay webhook signature.
// X-Razorpay-Signature = HMAC-SHA256(rawBody, webhookSecret)
export function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
  if (!signature || !webhookSecret) {
    throw new Error("Missing Razorpay webhook signature or secret");
  }
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Razorpay webhook signature verification failed");
  }
  return true;
}