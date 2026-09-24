import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from "base44:runtime";
import { computeExpiry } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required." }, { status: 400 });
    }

    const keyId = secrets.get("RAZORPAY_KEY_ID");
    const keySecret = secrets.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return Response.json({ error: "Payment gateway is not configured." }, { status: 503 });

    // Verify signature: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, keySecret)
    const expectedSig = await hmacSha256(razorpay_order_id + "|" + razorpay_payment_id, keySecret);
    if (expectedSig !== razorpay_signature) {
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const payments = await base44.asServiceRole.entities.SubscriptionPayment.filter(
      { gateway_order_id: razorpay_order_id }, "-created_date", 5
    );
    const payment = (payments && payments[0]) || null;
    if (!payment) return Response.json({ error: "Payment record not found for this order." }, { status: 404 });

    // Verify membership
    const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter(
      { workspace_id: payment.workspace_id, user_id: user.id }, "-created_date", 1
    );
    let isMember = (memberships && memberships.length > 0) || false;
    if (!isMember) {
      try {
        const ws = await base44.asServiceRole.entities.Workspace.get(payment.workspace_id);
        if (ws && ws.owner_user_id === user.id) isMember = true;
      } catch {}
    }
    if (!isMember) return Response.json({ error: "Not a member of this workspace." }, { status: 403 });

    if (payment.status === "SUCCESS") {
      return Response.json({ ok: true, alreadyVerified: true, subscription_id: payment.subscription_id });
    }

    // Fetch payment status from Razorpay
    const auth = btoa(`${keyId}:${keySecret}`);
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const razorpayPayment = await payRes.json();
    if (razorpayPayment.status !== "captured") {
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        status: "FAILED", failure_reason: `Razorpay status: ${razorpayPayment.status}`
      });
      return Response.json({ ok: false, error: "Payment was not completed.", status: razorpayPayment.status }, { status: 400 });
    }

    const pricing = await base44.asServiceRole.entities.PlanPricing.get(payment.pricing_id);
    const proPlans = await base44.asServiceRole.entities.Plan.filter({ code: "PRO" }, "-created_date", 10);
    const proPlan = (proPlans && proPlans[0]) || null;

    if (!pricing || !proPlan) {
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        status: "FAILED", failure_reason: "Pricing or plan configuration missing"
      });
      return Response.json({ error: "Plan configuration error. Please contact support." }, { status: 500 });
    }

    await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
      gateway_payment_id: razorpay_payment_id, status: "SUCCESS", verified_at: new Date().toISOString()
    });

    // Cancel existing active subs
    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
      { workspace_id: payment.workspace_id, status: "ACTIVE" }, "-created_date", 50
    );
    for (const s of existing || []) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: "CANCELLED", note: "Replaced by Pro payment"
      });
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const expiresAt = computeExpiry(startDate, pricing.duration_months || 1);

    const sub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
      workspace_id: payment.workspace_id, plan_id: proPlan.id, pricing_id: pricing.id,
      status: "ACTIVE", started_at: startDate, expires_at: expiresAt,
      auto_renew: false, source: "PAYMENT_GATEWAY",
      assigned_price: pricing.price, billing_cycle_snapshot: pricing.billing_cycle,
      note: "Pro activated via Razorpay payment"
    });

    await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
      subscription_id: sub.id
    });

    await base44.asServiceRole.entities.Workspace.update(payment.workspace_id, {
      plan_type: "pro", plan_status: "active"
    });

    return Response.json({ ok: true, activated: true, subscription_id: sub.id, expires_at: expiresAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function hmacSha256(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}