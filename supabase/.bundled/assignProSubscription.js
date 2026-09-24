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
var PLAN_CODES = { FREE: "FREE", PRO: "PRO" };
function computeExpiry(startDateStr, durationMonths) {
  const d = /* @__PURE__ */ new Date(startDateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().split("T")[0];
}

// supabase/functions/assignProSubscription/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
    const body = await req.json();
    const { workspace_id, pricing_id, start_date, note } = body;
    if (!workspace_id || !pricing_id || !start_date) return Response.json({ error: "workspace_id, pricing_id, start_date required" }, { status: 400 });
    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
    if (!pricing) return Response.json({ error: "Pricing not found" }, { status: 404 });
    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.PRO);
    const proPlan = plans && plans[0];
    if (!proPlan) return Response.json({ error: "Pro plan not configured" }, { status: 500 });
    const expiresAt = computeExpiry(start_date, pricing.duration_months || 1);
    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspace_id).eq("status", "ACTIVE");
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({ status: "CANCELLED", note: "Replaced by new Pro assignment" }).eq("id", s.id);
    }
    const { data: sub } = await supabaseAdmin.from("workspace_subscriptions").insert({
      workspace_id,
      plan_id: proPlan.id,
      pricing_id,
      status: "ACTIVE",
      started_at: start_date,
      expires_at: expiresAt,
      auto_renew: false,
      source: "ADMIN",
      assigned_price: pricing.price,
      billing_cycle_snapshot: pricing.billing_cycle,
      updated_by: user.id,
      note: note || "Admin assigned Pro"
    }).select("*").single();
    await supabaseAdmin.from("workspaces").update({ plan_type: "pro", plan_status: "active" }).eq("id", workspace_id);
    return Response.json({ ok: true, subscription_id: sub.id, expires_at: expiresAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
