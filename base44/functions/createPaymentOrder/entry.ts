// createPaymentOrder backend function.
// Creates a Razorpay order for Pro subscription purchase.
//
// SECURITY:
// - Amount comes from the trusted PlanPricing record in the database — never from the client.
// - Verifies the caller is a member of the workspace.
// - Verifies the pricing is active and belongs to the Pro plan.
// - Razorpay key_id and key_secret are read from process.env.
//
// If Razorpay is not configured, returns a clear "not configured" error.
// If check_only is true, just reports whether the gateway is configured without creating an order.

import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, pricing_id, check_only } = body;

    if (!workspace_id || !pricing_id) {
      return Response.json({ error: "workspace_id and pricing_id are required" }, { status: 400 });
    }

    // Check if Razorpay is configured.
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return Response.json(
        { error: "Online payment is not yet available. Please use the Request Upgrade option or contact support.", gatewayStatus: "pending" },
        { status: 503 }
      );
    }

    // If just checking availability, return now without creating an order.
    if (check_only) {
      return Response.json({ ok: true, configured: true });
    }

    // Verify workspace membership.
    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: "You are not authorized to make payments for this workspace." }, { status: 403 });
    }

    // Get the pricing from the database (trusted source — never trust client amount).
    const pricing = await base44.asServiceRole.entities.PlanPricing.get(pricing_id);
    if (!pricing || !pricing.is_active) {
      return Response.json({ error: "Selected pricing option is not available." }, { status: 400 });
    }

    // Verify the pricing belongs to the Pro plan.
    const proPlans = await base44.asServiceRole.entities.Plan.filter({ code: "PRO" });
    const proPlan = (proPlans && proPlans[0]) || null;
    if (!proPlan || pricing.plan_id !== proPlan.id) {
      return Response.json({ error: "Selected pricing is not a Pro plan option." }, { status: 400 });
    }

    // Create Razorpay order.
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const amountInPaise = Math.round(pricing.price * 100);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: pricing.currency || "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          workspace_id,
          pricing_id,
          plan_id: proPlan.id,
          user_id: user.id
        }
      })
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return Response.json({ error: "Failed to create payment order. Please try again.", details: err }, { status: 502 });
    }

    const order = await orderRes.json();

    // Create a SubscriptionPayment record with status CREATED.
    const payment = await base44.asServiceRole.entities.SubscriptionPayment.create({
      workspace_id,
      plan_id: proPlan.id,
      pricing_id: pricing.id,
      amount: pricing.price,
      currency: pricing.currency || "INR",
      gateway: "razorpay",
      gateway_order_id: order.id,
      billing_cycle_snapshot: pricing.billing_cycle,
      status: "CREATED"
    });

    return Response.json({
      ok: true,
      order_id: order.id,
      key_id: keyId,
      payment_id: payment.id,
      amount: pricing.price,
      currency: pricing.currency || "INR"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}