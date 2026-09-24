import crypto from "crypto";
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import { activateProFromPayment } from "../../shared/paymentEngine.js";

export async function handle(req, base44) {
  const body = req.body || {};
  const signature = req.headers?.["x-razorpay-signature"] || req.headers?.["X-Razorpay-Signature"] || "";

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { status: 500, body: { error: "Razorpay secret not configured" } };

  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
  if (signature !== expected) {
    return { status: 400, body: { error: "Invalid signature" } };
  }

  const event = body.event;
  const payload = body.payload?.payment?.entity || {};

  if (event === "payment.captured" || event === "payment.authorized") {
    const orderId = payload.order_id;
    const paymentId = payload.id;
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
        .update({ gateway_payment_id: paymentId, status: "SUCCESS", verified_at: new Date().toISOString() })
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