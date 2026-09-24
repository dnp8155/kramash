// Shared payment engine — Razorpay verification + Pro activation.
// Ported from supabase/functions/_shared/paymentEngine.ts.
import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { computeExpiry, PLAN_CODES, SUB_STATUS } from "./planEngine.js";

export async function activateProFromPayment(payment, pricing, proPlan) {
  const supabaseAdmin = getSupabaseAdmin();
  if (payment.status === "SUCCESS" && payment.subscription_id) {
    return { ok: true, alreadyActivated: true, subscription_id: payment.subscription_id };
  }

  const startDate = new Date().toISOString().split("T")[0];
  const expiresAt = computeExpiry(startDate, pricing.duration_months || 1);

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

  await supabaseAdmin
    .from("workspaces")
    .update({ plan_type: "pro", plan_status: "active" })
    .eq("id", payment.workspace_id);

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

export async function markPaymentFailed(paymentId, reason) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin
    .from("subscription_payments")
    .update({
      status: "FAILED",
      failure_reason: reason,
      verified_at: new Date().toISOString()
    })
    .eq("id", paymentId);
}

export async function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
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

export async function verifyRazorpayPayment(paymentId, keyId, keySecret) {
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