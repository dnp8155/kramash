// supabase/functions/_shared/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders
      });
    }
    const response = await handler(req);
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
var supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// supabase/functions/_shared/planEngine.ts
var SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };
function computeExpiry(startDateStr, durationMonths) {
  const d = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().split("T")[0];
}

// supabase/functions/_shared/paymentEngine.ts
async function activateProFromPayment(payment, pricing, proPlan) {
  if (payment.status === "SUCCESS" && payment.subscription_id) {
    return { ok: true, alreadyActivated: true, subscription_id: payment.subscription_id };
  }
  const startDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const expiresAt = computeExpiry(startDate, pricing.duration_months || 1);
  const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", payment.workspace_id).eq("status", SUB_STATUS.ACTIVE);
  for (const s of existing || []) {
    await supabaseAdmin.from("workspace_subscriptions").update({ status: SUB_STATUS.CANCELLED, note: "Replaced by payment gateway activation" }).eq("id", s.id);
  }
  const { data: sub } = await supabaseAdmin.from("workspace_subscriptions").insert({
    workspace_id: payment.workspace_id,
    plan_id: proPlan.id,
    pricing_id: pricing.id,
    status: SUB_STATUS.ACTIVE,
    started_at: startDate,
    expires_at: expiresAt,
    auto_renew: false,
    source: "PAYMENT_GATEWAY",
    assigned_price: pricing.price,
    billing_cycle_snapshot: pricing.billing_cycle,
    updated_by: "payment_gateway",
    note: `Activated via ${payment.gateway} payment`
  }).select("*").single();
  await supabaseAdmin.from("workspaces").update({ plan_type: "pro", plan_status: "active" }).eq("id", payment.workspace_id);
  await supabaseAdmin.from("subscription_payments").update({
    status: "SUCCESS",
    subscription_id: sub?.id,
    verified_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", payment.id);
  return { ok: true, subscription_id: sub?.id, expires_at: expiresAt };
}
async function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
  if (!signature || !webhookSecret) {
    throw new Error("Missing Razorpay webhook signature or secret");
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedSignature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expectedSignature !== signature) {
    throw new Error("Razorpay webhook signature verification failed");
  }
  return true;
}

// supabase/functions/handleRazorpayWebhook/index.ts
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
      const payment = payments && payments[0] || null;
      if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status === "SUCCESS") return Response.json({ ok: true, alreadyProcessed: true });
      const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", payment.pricing_id).single();
      const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
      const proPlan = proPlans && proPlans[0] || null;
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
