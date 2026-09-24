// verifyPayment — Verify a Razorpay payment and activate Pro subscription.
// Ported from supabase/functions/verifyPayment — uses Supabase admin client + payment engine.
import { secrets } from 'base44:runtime';
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { PLAN_CODES } from "../../shared/planEngine.js";
import { activateProFromPayment, markPaymentFailed, verifyRazorpaySignature } from "../../shared/paymentEngine.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "Missing Razorpay payment parameters" }, { status: 400 });
    }

    const keySecret = secrets.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) return Response.json({ error: "Razorpay keys not configured" }, { status: 500 });

    let payment = null;
    if (payment_id) {
      const { data: p } = await supabaseAdmin.from("subscription_payments").select("*").eq("id", payment_id).single();
      payment = p;
    } else {
      const { data: p } = await supabaseAdmin.from("subscription_payments").select("*").eq("gateway_order_id", razorpay_order_id).order("created_at", { ascending: false }).limit(1);
      payment = (p && p[0]) || null;
    }
    if (!payment) return Response.json({ error: "Payment record not found" }, { status: 404 });

    try {
      await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret);
    } catch (sigErr) {
      await markPaymentFailed(payment.id, sigErr.message);
      return Response.json({ error: "Payment verification failed", details: sigErr.message }, { status: 400 });
    }

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", payment.pricing_id).single();
    const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.PRO);
    const proPlan = (proPlans && proPlans[0]) || null;

    if (!pricing || !proPlan) {
      await markPaymentFailed(payment.id, "Pricing or Pro plan not found");
      return Response.json({ error: "Pricing or Pro plan not found" }, { status: 500 });
    }

    await supabaseAdmin
      .from("subscription_payments")
      .update({ gateway_payment_id: razorpay_payment_id })
      .eq("id", payment.id);

    const result = await activateProFromPayment(payment, pricing, proPlan);

    return Response.json({ ok: true, subscription_id: result.subscription_id, expires_at: result.expires_at });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}