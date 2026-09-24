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
var SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };
var BOOLEAN_LIMIT_KEYS = /* @__PURE__ */ new Set([
  "pdf_export_enabled",
  "reminders_enabled",
  "notifications_enabled",
  "link_sharing_enabled",
  "client_portal_enabled",
  "team_portal_enabled",
  "excel_csv_export_enabled",
  "event_display_customization_enabled",
  "quotation_logo_enabled"
]);
var UNLIMITED = 999999;
function parseLimitValue(key, rawValue) {
  if (BOOLEAN_LIMIT_KEYS.has(key)) return String(rawValue) === "true";
  const n = parseInt(String(rawValue), 10);
  return isNaN(n) ? UNLIMITED : n;
}
async function resolvePlanContext(workspaceId) {
  const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
  const activeSub = subs && subs.find((s) => s.status === SUB_STATUS.ACTIVE) || subs && subs[0] || null;
  let planCode = PLAN_CODES.FREE;
  let planStatus = "free";
  let isExpired = false;
  let expiresAt = null;
  let subscription = activeSub;
  if (activeSub) {
    if (activeSub.plan_id) {
      const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", activeSub.plan_id).single();
      if (plan) planCode = plan.code;
    }
    if (activeSub.expires_at) {
      const exp = /* @__PURE__ */ new Date(activeSub.expires_at + "T00:00:00");
      if (exp < /* @__PURE__ */ new Date() && activeSub.status === SUB_STATUS.ACTIVE) isExpired = true;
    }
    if (isExpired) {
      planCode = PLAN_CODES.FREE;
      planStatus = "expired";
    } else {
      planStatus = (activeSub.status || "active").toLowerCase();
    }
    expiresAt = activeSub.expires_at || null;
  }
  const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", planCode);
  const planRecord = plans && plans[0] || null;
  let limits = {};
  if (planRecord) {
    const { data: planLimits } = await supabaseAdmin.from("plan_limits").select("*").eq("plan_id", planRecord.id).eq("enabled", true);
    for (const pl of planLimits || []) {
      limits[pl.limit_key] = parseLimitValue(pl.limit_key, pl.limit_value);
    }
  }
  let storageGb = limits.max_storage_gb || 0;
  if (activeSub && activeSub.pricing_id && !isExpired) {
    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", activeSub.pricing_id).single();
    if (pricing && typeof pricing.storage_gb === "number") storageGb = pricing.storage_gb;
  }
  return { planCode, planStatus, isExpired, expiresAt, subscription, limits, planRecord, storageGb };
}
async function countUsage(workspaceId, resourceKey) {
  switch (resourceKey) {
    case "max_events": {
      const { data } = await supabaseAdmin.from("events").select("id").eq("workspace_id", workspaceId);
      return (data || []).length;
    }
    case "max_team_members": {
      const { data } = await supabaseAdmin.from("team_members").select("id").eq("workspace_id", workspaceId).eq("status", "active");
      return (data || []).length;
    }
    case "max_services": {
      const { data } = await supabaseAdmin.from("services").select("id").eq("workspace_id", workspaceId).eq("status", "active");
      return (data || []).length;
    }
    case "max_leads": {
      const { data } = await supabaseAdmin.from("leads").select("id").eq("workspace_id", workspaceId);
      return (data || []).length;
    }
    default:
      return 0;
  }
}

// supabase/functions/adminListWorkspaces/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const search = (body.search || "").toLowerCase();
    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: members } = await supabaseAdmin.from("workspace_members").select("*").order("created_at", { ascending: false }).limit(2e3);
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2e3);
    const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").order("created_at", { ascending: false }).limit(2e3);
    const ownerByWs = {};
    for (const m of members || []) {
      if (m.role === "owner" && !ownerByWs[m.workspace_id]) ownerByWs[m.workspace_id] = m.user_id;
    }
    const userMap = {};
    for (const u of users || []) userMap[u.id] = u;
    const subByWs = {};
    for (const s of subs || []) {
      if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
    }
    const rows = [];
    for (const ws of workspaces || []) {
      const ownerId = ownerByWs[ws.id] || ws.owner_user_id;
      const owner = ownerId && userMap[ownerId];
      const sub = subByWs[ws.id];
      const ctx = await resolvePlanContext(ws.id);
      const usage = {
        events: await countUsage(ws.id, "max_events"),
        team_members: await countUsage(ws.id, "max_team_members"),
        services: await countUsage(ws.id, "max_services")
      };
      const ownerName = owner ? owner.full_name || owner.email || "\u2014" : "\u2014";
      const ownerEmail = owner ? owner.email || "\u2014" : "\u2014";
      const haystack = `${ws.name} ${ownerName} ${ownerEmail}`.toLowerCase();
      if (search && !haystack.includes(search)) continue;
      rows.push({
        id: ws.id,
        name: ws.name,
        owner_name: ownerName,
        owner_email: ownerEmail,
        created_date: ws.created_at,
        plan_type: ctx.planCode.toLowerCase(),
        plan_status: ctx.planStatus,
        expires_at: ctx.expiresAt,
        subscription_status: sub ? sub.status : "ACTIVE",
        storage_gb: ctx.storageGb || 0,
        usage
      });
    }
    return Response.json({ workspaces: rows, total: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
