// handleStripeWebhook — Stripe webhook handler for checkout.session.completed.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { verifyStripeSignature, activateProFromPayment } from "../_shared/paymentEngine.ts";

Deno.serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) return Response.json({ error: "Webhook not configured" }, { status: 503 });

    const sig = req.headers.get("stripe-signature") || "";
    const rawBody = await req.text();

    const event = await verifyStripeSignature(rawBody, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspace_id;
      const pricingId = session.metadata?.pricing_id;
      if (!workspaceId || !pricingId) return Response.json({ error: "Missing metadata" }, { status: 400 });

      const { data: payments } = await supabaseAdmin.from("subscription_payments").select("*").eq("workspace_id", workspaceId).eq("gateway_order_id", session.id);
      const payment = (payments && payments[0]) || null;
      if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status === "SUCCESS") return Response.json({ ok: true, alreadyProcessed: true });

      const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricingId).single();
      const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
      const proPlan = (proPlans && proPlans[0]) || null;
      if (!pricing || !proPlan) return Response.json({ error: "Plan configuration error" }, { status: 500 });

      await supabaseAdmin.from("subscription_payments").update({ gateway_payment_id: session.payment_intent || "" }).eq("id", payment.id);
      await activateProFromPayment({ ...payment, gateway_payment_id: session.payment_intent || "" }, pricing, proPlan);
      return Response.json({ ok: true, activated: true });
    }

    return Response.json({ ok: true, received: event.type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});