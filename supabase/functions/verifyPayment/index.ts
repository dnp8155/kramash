import { withCors } from "../_shared/cors.ts";
// verifyPayment — Verify Razorpay payment signature + activate Pro.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { verifyRazorpaySignature, verifyRazorpayPayment, activateProFromPayment, markPaymentFailed } from "../_shared/paymentEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required." }, { status: 400 });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return Response.json({ error: "Payment gateway is not configured." }, { status: 503 });

    await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret);

    const { data: payments } = await supabaseAdmin.from("subscription_payments").select("*").eq("gateway_order_id", razorpay_order_id);
    const payment = (payments && payments[0]) || null;
    if (!payment) return Response.json({ error: "Payment record not found for this order." }, { status: 404 });

    const isMember = await verifyWorkspaceMembership(user.id, payment.workspace_id);
    if (!isMember) return Response.json({ error: "Not a member of this workspace." }, { status: 403 });

    if (payment.status === "SUCCESS") {
      return Response.json({ ok: true, alreadyVerified: true, subscription_id: payment.subscription_id });
    }

    const razorpayPayment = await verifyRazorpayPayment(razorpay_payment_id, keyId, keySecret);
    if (razorpayPayment.status !== "captured") {
      await markPaymentFailed(payment.id, `Razorpay status: ${razorpayPayment.status}`);
      return Response.json({ ok: false, error: "Payment was not completed.", status: razorpayPayment.status }, { status: 400 });
    }

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", payment.pricing_id).single();
    const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
    const proPlan = (proPlans && proPlans[0]) || null;

    if (!pricing || !proPlan) {
      await markPaymentFailed(payment.id, "Pricing or plan configuration missing");
      return Response.json({ error: "Plan configuration error. Please contact support." }, { status: 500 });
    }

    await supabaseAdmin.from("subscription_payments").update({ gateway_payment_id: razorpay_payment_id }).eq("id", payment.id);

    const result = await activateProFromPayment({ ...payment, gateway_payment_id: razorpay_payment_id }, pricing, proPlan);
    return Response.json({ ok: true, activated: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));