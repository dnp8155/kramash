// Shared payment engine — Razorpay verification + Pro activation.
// Uses Deno's built-in crypto and supabaseAdmin.

import { supabaseAdmin } from "./supabaseClient.ts";
import { computeExpiry, PLAN_CODES, SUB_STATUS } from "./planEngine.ts";

// Activate Pro subscription after verified payment.
export async function activateProFromPayment(payment: any, pricing: any, proPlan: any) {
  if (payment.status === "SUCCESS" && payment.subscription_id) {
    return { ok: true, alreadyActivated: true, subscription_id: payment.subscription_id };
  }

  const startDate = new Date().toISOString().split("T")[0];
  const expiresAt = computeExpiry(startDate, pricing.duration_months || 1);

  // Cancel existing ACTIVE subscriptions
  const { data: existing } = await supabaseAdmin
    .from("workspace_subscriptions")
    .select("*")
    .eq("workspace_id", payment.workspace_id)
    .eq("status", SUB_STATUS.ACTIVE);

  for (const s of existing || []) {
    await supabaseAdmin
      .from("workspace_subscriptions")
      .update({ status: SUB_STATUS.CANCELLED, note: "Replaced by payment gateway activation" })
      .eq("id", s.id);
  }

  // Create new ACTIVE Pro subscription
  const { data: sub } = await supabaseAdmin
    .from("workspace_subscriptions")
    .insert({
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
    })
    .select("*")
    .single();

  // Update workspace plan fields
  await supabaseAdmin
    .from("workspaces")
    .update({ plan_type: "pro", plan_status: "active" })
    .eq("id", payment.workspace_id);

  // Mark payment as SUCCESS and link subscription
  await supabaseAdmin
    .from("subscription_payments")
    .update({
      status: "SUCCESS",
      subscription_id: sub?.id,
      verified_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  return { ok: true, subscription_id: sub?.id, expires_at: expiresAt };
}

export async function markPaymentFailed(paymentId: string, reason: string) {
  await supabaseAdmin
    .from("subscription_payments")
    .update({ status: "FAILED", failure_reason: reason, verified_at: new Date().toISOString() })
    .eq("id", paymentId);
}

// Verify a Razorpay payment signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  if (!orderId || !paymentId || !signature || !keySecret) {
    throw new Error("Missing Razorpay signature parameters");
  }
  const body = `${orderId}|${paymentId}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expectedSignature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedSignature !== signature) {
    throw new Error("Razorpay signature verification failed");
  }
  return true;
}

export async function verifyRazorpayPayment(paymentId: string, keyId: string, keySecret: string) {
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay API error: ${err}`);
  }
  return await res.json();
}

export async function verifyRazorpayWebhookSignature(rawBody: string, signature: string, webhookSecret: string) {
  if (!signature || !webhookSecret) {
    throw new Error("Missing Razorpay webhook signature or secret");
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedSignature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedSignature !== signature) {
    throw new Error("Razorpay webhook signature verification failed");
  }
  return true;
}