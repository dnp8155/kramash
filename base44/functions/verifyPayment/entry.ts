// verifyPayment backend function.
// Verifies a Stripe Checkout Session and activates Pro if payment succeeded.
//
// This is called by the client after redirecting back from Stripe checkout.
// It re-verifies with the Stripe API — never trusts the client's claim of success.
//
// Idempotent: if the payment was already verified, returns the existing subscription.

import { verifyStripeSession, activateProFromPayment, markPaymentFailed } from "../../shared/paymentEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return Response.json({ error: "Session ID is required." }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return Response.json({ error: "Payment gateway is not configured." }, { status: 503 });
    }

    // Find the payment record by session ID.
    const payments = await base44.asServiceRole.entities.SubscriptionPayment.filter({
      gateway_order_id: session_id
    });
    const payment = (payments && payments[0]) || null;
    if (!payment) {
      return Response.json({ error: "Payment record not found for this session." }, { status: 404 });
    }

    // Idempotency: already verified.
    if (payment.status === "SUCCESS") {
      return Response.json({ ok: true, alreadyVerified: true, subscription_id: payment.subscription_id });
    }

    // Verify with Stripe API.
    const session = await verifyStripeSession(session_id, secretKey);

    if (session.payment_status === "paid") {
      // Get pricing and plan from DB.
      const pricing = await base44.asServiceRole.entities.PlanPricing.get(payment.pricing_id);
      const proPlans = await base44.asServiceRole.entities.Plan.filter({ code: "PRO" });
      const proPlan = (proPlans && proPlans[0]) || null;

      if (!pricing || !proPlan) {
        await markPaymentFailed(base44, payment.id, "Pricing or plan configuration missing");
        return Response.json({ error: "Plan configuration error. Please contact support." }, { status: 500 });
      }

      // Update payment with gateway payment ID.
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        gateway_payment_id: session.payment_intent || ""
      });

      // Activate Pro.
      const result = await activateProFromPayment(base44, { ...payment, gateway_payment_id: session.payment_intent || "" }, pricing, proPlan);
      return Response.json({ ok: true, activated: true, ...result });
    } else {
      // Payment not completed.
      await markPaymentFailed(base44, payment.id, `Payment status: ${session.payment_status}`);
      return Response.json({ ok: false, error: "Payment was not completed.", status: session.payment_status }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}