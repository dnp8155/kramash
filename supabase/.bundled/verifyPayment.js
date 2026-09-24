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
async function getUserFromRequest(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// supabase/functions/_shared/planEngine.ts
var SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };
function computeExpiry(startDateStr, durationMonths) {
  const d = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().split("T")[0];
}
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
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
async function markPaymentFailed(paymentId, reason) {
  await supabaseAdmin.from("subscription_payments").update({
    status: "FAILED",
    failure_reason: reason,
    verified_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", paymentId);
}
async function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  if (!orderId || !paymentId || !signature || !keySecret) {
    throw new Error("Missing Razorpay signature parameters");
  }
  const body = `${orderId}|${paymentId}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expectedSignature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expectedSignature !== signature) {
    throw new Error("Razorpay signature verification failed");
  }
  return true;
}
async function verifyRazorpayPayment(paymentId, keyId, keySecret) {
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay API error: ${err}`);
  }
  return await res.json();
}

// supabase/functions/verifyPayment/index.ts
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
    const payment = payments && payments[0] || null;
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
    const proPlan = proPlans && proPlans[0] || null;
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
