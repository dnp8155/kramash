// verifyPayment backend function.
// Verifies a Razorpay payment signature and activates Pro if payment succeeded.
//
// This is called by the client after the Razorpay checkout modal closes.
// It verifies the signature server-side — never trusts the client's claim of success.
//
// Idempotent: if the payment was already verified, returns the existing subscription.

import { verifyRazorpaySignature, verifyRazorpayPayment, activateProFromPayment, markPaymentFailed } from "../../shared/paymentEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return Response.json({ error: "Payment gateway is not configured." }, { status: 503 });
    }

    // Verify the Razorpay signature.
    verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret);

    // Find the payment record by order ID.
    const payments = await base44.asServiceRole.entities.SubscriptionPayment.filter({
      gateway_order_id: razorpay_order_id
    });
    const payment = (payments && payments[0]) || null;
    if (!payment) {
      return Response.json({ error: "Payment record not found for this order." }, { status: 404 });
    }

    // Idempotency: already verified.
    if (payment.status === "SUCCESS") {
      return Response.json({ ok: true, alreadyVerified: true, subscription_id: payment.subscription_id });
    }

    // Double-check payment status with Razorpay API.
    const razorpayPayment = await verifyRazorpayPayment(razorpay_payment_id, keyId, keySecret);
    if (razorpayPayment.status !== "captured") {
      await markPaymentFailed(base44, payment.id, `Razorpay status: ${razorpayPayment.status}`);
      return Response.json({ ok: false, error: "Payment was not completed.", status: razorpayPayment.status }, { status: 400 });
    }

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
      gateway_payment_id: razorpay_payment_id
    });

    // Activate Pro.
    const result = await activateProFromPayment(base44, { ...payment, gateway_payment_id: razorpay_payment_id }, pricing, proPlan);
    return Response.json({ ok: true, activated: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}