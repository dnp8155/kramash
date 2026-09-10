// handleRazorpayWebhook backend function.
// Receives Razorpay webhook events and verifies the signature.
// Handles payment.captured to activate Pro subscriptions.
//
// SECURITY:
// - Verifies Razorpay signature using RAZORPAY_WEBHOOK_SECRET.
// - Never trusts arbitrary payloads.
// - Idempotent: duplicate events don't extend subscriptions multiple times.

import { verifyRazorpayWebhookSignature, activateProFromPayment } from "../../shared/paymentEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keySecret || !webhookSecret) {
      return Response.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const sig = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();

    // Verify Razorpay webhook signature — rejects forged requests.
    verifyRazorpayWebhookSignature(rawBody, sig, webhookSecret);

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        return Response.json({ error: "Missing order ID in webhook payload" }, { status: 400 });
      }

      // Find the payment record.
      const payments = await base44.asServiceRole.entities.SubscriptionPayment.filter({
        gateway_order_id: orderId
      });
      const payment = (payments && payments[0]) || null;
      if (!payment) {
        return Response.json({ error: "Payment not found" }, { status: 404 });
      }

      // Idempotency: already processed.
      if (payment.status === "SUCCESS") {
        return Response.json({ ok: true, alreadyProcessed: true });
      }

      // Get pricing and plan.
      const pricing = await base44.asServiceRole.entities.PlanPricing.get(payment.pricing_id);
      const proPlans = await base44.asServiceRole.entities.Plan.filter({ code: "PRO" });
      const proPlan = (proPlans && proPlans[0]) || null;

      if (!pricing || !proPlan) {
        return Response.json({ error: "Plan configuration error" }, { status: 500 });
      }

      // Update payment with gateway payment ID.
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        gateway_payment_id: paymentId || ""
      });

      // Activate Pro.
      await activateProFromPayment(base44, { ...payment, gateway_payment_id: paymentId || "" }, pricing, proPlan);
      return Response.json({ ok: true, activated: true });
    }

    // Acknowledge other event types without processing.
    return Response.json({ ok: true, received: event.event });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}