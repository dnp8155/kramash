// createPaymentOrder — Create Razorpay order for Pro subscription.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, pricing_id, check_only } = body;
    if (!workspace_id || !pricing_id) return Response.json({ error: "workspace_id and pricing_id are required" }, { status: 400 });

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return Response.json({ error: "Online payment is not yet available. Please use the Request Upgrade option or contact support.", gatewayStatus: "pending" }, { status: 503 });
    }

    if (check_only) return Response.json({ ok: true, configured: true });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "You are not authorized to make payments for this workspace." }, { status: 403 });

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
    if (!pricing || !pricing.is_active) return Response.json({ error: "Selected pricing option is not available." }, { status: 400 });

    const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
    const proPlan = (proPlans && proPlans[0]) || null;
    if (!proPlan || pricing.plan_id !== proPlan.id) return Response.json({ error: "Selected pricing is not a Pro plan option." }, { status: 400 });

    const auth = btoa(`${keyId}:${keySecret}`);
    const amountInPaise = Math.round(pricing.price * 100);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInPaise, currency: pricing.currency || "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { workspace_id, pricing_id, plan_id: proPlan.id, user_id: user.id }
      })
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return Response.json({ error: "Failed to create payment order. Please try again.", details: err }, { status: 502 });
    }

    const order = await orderRes.json();

    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        workspace_id, plan_id: proPlan.id, pricing_id: pricing.id,
        amount: pricing.price, currency: pricing.currency || "INR",
        gateway: "razorpay", gateway_order_id: order.id,
        billing_cycle_snapshot: pricing.billing_cycle, status: "CREATED"
      })
      .select("*")
      .single();

    return Response.json({ ok: true, order_id: order.id, key_id: keyId, payment_id: payment.id, amount: pricing.price, currency: pricing.currency || "INR" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});