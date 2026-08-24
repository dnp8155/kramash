// Shared payment engine for subscription payment verification and Pro activation.
// Used by verifyPayment and handleStripeWebhook to avoid duplicate logic.

import { computeExpiry, PLAN_CODES, SUB_STATUS } from "./planEngine.ts";

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