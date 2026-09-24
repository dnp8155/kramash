// createPaymentOrder — Create a Razorpay order for Pro subscription checkout.
// Ported from supabase/functions/createPaymentOrder — uses Supabase admin client + Razorpay API.
import { secrets } from 'base44:runtime';
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { PLAN_CODES } from "../../shared/planEngine.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id, pricing_id } = body;
    if (!workspace_id || !pricing_id) return Response.json({ error: "workspace_id and pricing_id required" }, { status: 400 });

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
    if (!pricing) return Response.json({ error: "Pricing plan not found" }, { status: 404 });

    const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", pricing.plan_id).single();
    if (!plan || plan.code !== PLAN_CODES.PRO) return Response.json({ error: "Only Pro plan can be purchased" }, { status: 400 });

    const amount = Math.round(Number(pricing.price) * 100);
    const currency = pricing.currency || "INR";

    const keyId = secrets.get("RAZORPAY_KEY_ID");
    const keySecret = secrets.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return Response.json({ error: "Razorpay keys not configured" }, { status: 500 });

    const receipt = `sub_${workspace_id.slice(0, 12)}_${Date.now()}`;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount, currency, receipt, notes: { workspace_id, pricing_id, user_id: user.id } })
    });
    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: "Razorpay order creation failed", details: err }, { status: 502 });
    }
    const order = await res.json();

    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        workspace_id, plan_id: plan.id, pricing_id: pricing.id,
        amount: Number(pricing.price), currency, gateway: "razorpay",
        gateway_order_id: order.id, billing_cycle_snapshot: pricing.billing_cycle,
        status: "CREATED"
      })
      .select("*")
      .single();

    return Response.json({
      order_id: order.id, amount, currency, key_id: keyId,
      payment_id: payment?.id, billing_cycle: pricing.billing_cycle, price: pricing.price
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}