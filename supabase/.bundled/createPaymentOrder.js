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
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
}

// supabase/functions/createPaymentOrder/index.ts
Deno.serve(withCors(async (req) => {
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
    const proPlan = proPlans && proPlans[0] || null;
    if (!proPlan || pricing.plan_id !== proPlan.id) return Response.json({ error: "Selected pricing is not a Pro plan option." }, { status: 400 });
    const auth = btoa(`${keyId}:${keySecret}`);
    const amountInPaise = Math.round(pricing.price * 100);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: pricing.currency || "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { workspace_id, pricing_id, plan_id: proPlan.id, user_id: user.id }
      })
    });
    if (!orderRes.ok) {
      const err = await orderRes.text();
      return Response.json({ error: "Failed to create payment order. Please try again.", details: err }, { status: 502 });
    }
    const order = await orderRes.json();
    const { data: payment } = await supabaseAdmin.from("subscription_payments").insert({
      workspace_id,
      plan_id: proPlan.id,
      pricing_id: pricing.id,
      amount: pricing.price,
      currency: pricing.currency || "INR",
      gateway: "razorpay",
      gateway_order_id: order.id,
      billing_cycle_snapshot: pricing.billing_cycle,
      status: "CREATED"
    }).select("*").single();
    return Response.json({ ok: true, order_id: order.id, key_id: keyId, payment_id: payment.id, amount: pricing.price, currency: pricing.currency || "INR" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
