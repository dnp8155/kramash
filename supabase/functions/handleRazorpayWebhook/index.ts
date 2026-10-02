import { withCors } from "../_shared/cors.ts";
// handleRazorpayWebhook — Razorpay webhook handler for payment.captured.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { verifyRazorpayWebhookSignature, activateProFromPayment } from "../_shared/paymentEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) return Response.json({ error: "Webhook not configured" }, { status: 503 });

    const sig = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();

    await verifyRazorpayWebhookSignature(rawBody, sig, webhookSecret);
    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;
      if (!orderId) return Response.json({ error: "Missing order ID in webhook payload" }, { status: 400 });

      const { data: payments } = await supabaseAdmin.from("subscription_payments").select("*").eq("gateway_order_id", orderId);
      const payment = (payments && payments[0]) || null;
      if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status === "SUCCESS") return Response.json({ ok: true, alreadyProcessed: true });

      const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", payment.pricing_id).single();
      const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
      const proPlan = (proPlans && proPlans[0]) || null;
      if (!pricing || !proPlan) return Response.json({ error: "Plan configuration error" }, { status: 500 });

      await supabaseAdmin.from("subscription_payments").update({ gateway_payment_id: paymentId || "" }).eq("id", payment.id);
      await activateProFromPayment({ ...payment, gateway_payment_id: paymentId || "" }, pricing, proPlan);
      return Response.json({ ok: true, activated: true });
    }

    return Response.json({ ok: true, received: event.event });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));