// createPaymentOrder backend function.
// Creates a Stripe Checkout Session for Pro subscription purchase.
//
// SECURITY:
// - Amount comes from the trusted PlanPricing record in the database — never from the client.
// - Verifies the caller is a member of the workspace.
// - Verifies the pricing is active and belongs to the Pro plan.
// - Stripe secret key is read from process.env.STRIPE_SECRET_KEY (app secret).
//
// If Stripe is not configured, returns a clear "not configured" error.

import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, pricing_id } = body;

    if (!workspace_id || !pricing_id) {
      return Response.json({ error: "workspace_id and pricing_id are required" }, { status: 400 });
    }

    // Check if Stripe is configured.
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return Response.json(
        { error: "Online payment is not yet available. Please use the Request Upgrade option or contact support.", gatewayStatus: "pending" },
        { status: 503 }
      );
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

    // Determine the origin for success/cancel URLs.
    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/plan?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/plan?payment=cancelled`;

    // Create Stripe Checkout Session.
    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        mode: "payment",
        "line_items[0][price_data][currency]": (pricing.currency || "INR").toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(Math.round(pricing.price * 100)),
        "line_items[0][price_data][product_data][name]": `Kramashah Pro — ${pricing.billing_cycle}`,
        "line_items[0][quantity]": "1",
        "metadata[workspace_id]": workspace_id,
        "metadata[pricing_id]": pricing_id,
        "metadata[plan_id]": proPlan.id,
        "metadata[user_id]": user.id,
        success_url: successUrl,
        cancel_url: cancelUrl
      })
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      return Response.json({ error: "Failed to create payment session. Please try again.", details: err }, { status: 502 });
    }

    const session = await sessionRes.json();

    // Create a SubscriptionPayment record with status CREATED.
    const payment = await base44.asServiceRole.entities.SubscriptionPayment.create({
      workspace_id,
      plan_id: proPlan.id,
      pricing_id: pricing.id,
      amount: pricing.price,
      currency: pricing.currency || "INR",
      gateway: "stripe",
      gateway_order_id: session.id,
      billing_cycle_snapshot: pricing.billing_cycle,
      status: "CREATED"
    });

    return Response.json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
      payment_id: payment.id,
      amount: pricing.price,
      currency: pricing.currency || "INR"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}