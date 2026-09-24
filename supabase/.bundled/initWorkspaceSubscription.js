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

// supabase/functions/initWorkspaceSubscription/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, default_services } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", user.id).limit(1);
    if (!memberships || memberships.length === 0) return Response.json({ error: "Not a workspace member" }, { status: 403 });
    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("id").eq("workspace_id", workspace_id).limit(1);
    if (existing && existing.length > 0) return Response.json({ ok: true, already_exists: true });
    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.FREE);
    const freePlan = plans && plans[0];
    if (!freePlan) return Response.json({ error: "Free plan not configured" }, { status: 500 });
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: sub } = await supabaseAdmin.from("workspace_subscriptions").insert({
      workspace_id,
      plan_id: freePlan.id,
      pricing_id: "",
      status: "ACTIVE",
      started_at: today,
      expires_at: "",
      auto_renew: false,
      source: "ONBOARDING",
      assigned_price: 0,
      billing_cycle_snapshot: "",
      updated_by: user.id,
      note: "Initial Free plan"
    }).select("*").single();
    const { data: existingServices } = await supabaseAdmin.from("services").select("id").eq("workspace_id", workspace_id).limit(1);
    if ((!existingServices || existingServices.length === 0) && Array.isArray(default_services)) {
      await supabaseAdmin.from("services").insert(default_services.map((s) => ({ ...s, workspace_id, status: "active" })));
    }
    return Response.json({ ok: true, subscription_id: sub.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
