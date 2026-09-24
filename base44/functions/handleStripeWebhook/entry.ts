import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import { activateProFromPayment } from "../../shared/paymentEngine.js";

export async function handle(req, base44) {
  const body = req.body || {};
  const event = body.type || body.event_type;

  if (event === "checkout.session.completed" || event === "payment_intent.succeeded") {
    const session = body.data?.object || {};
    const orderId = session.id || session.payment_intent;
    const supabaseAdmin = getSupabaseAdmin();

    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("gateway_order_id", orderId)
      .limit(1);

    if (payment && payment.length > 0) {
      const p = payment[0];
      await supabaseAdmin
        .from("subscription_payments")
        .update({ status: "SUCCESS", verified_at: new Date().toISOString() })
        .eq("id", p.id);

      if (p.pricing_id) {
        const { data: pricing } = await supabaseAdmin
          .from("plan_pricings")
          .select("*")
          .eq("id", p.pricing_id)
          .limit(1);

        const { data: proPlan } = await supabaseAdmin
          .from("plans")
          .select("*")
          .eq("code", "PRO")
          .limit(1);

        if (pricing && pricing.length > 0 && proPlan && proPlan.length > 0) {
          await activateProFromPayment({ ...p, status: "SUCCESS" }, pricing[0], proPlan[0]);
        }
      }
    }
  }

  return { status: 200, body: { received: true } };
}