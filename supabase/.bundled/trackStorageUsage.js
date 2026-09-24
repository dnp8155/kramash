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
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
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

// supabase/functions/trackStorageUsage/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, action, file_size_bytes } = body || {};
    if (!workspace_id) return Response.json({ error: "workspace_id is required" }, { status: 400 });
    if (!action) return Response.json({ error: "action is required" }, { status: 400 });
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a member of this workspace" }, { status: 403 });
    const planCtx = await resolvePlanContext(workspace_id);
    const limitBytes = (planCtx.storageGb || 0) * 1024 * 1024 * 1024;
    const { data: existing } = await supabaseAdmin.from("storage_usage").select("*").eq("workspace_id", workspace_id).limit(1);
    let record = existing && existing[0] || null;
    if (!record) {
      const { data: created } = await supabaseAdmin.from("storage_usage").insert({ workspace_id, total_bytes: 0, file_count: 0 }).select("*").single();
      record = created;
    }
    if (action === "get") {
      return Response.json({
        total_bytes: record.total_bytes || 0,
        file_count: record.file_count || 0,
        limit_bytes: limitBytes,
        storage_gb: planCtx.storageGb || 0,
        plan_code: planCtx.planCode
      });
    }
    const size = Number(file_size_bytes) || 0;
    if (action === "check") {
      const projected = (record.total_bytes || 0) + size;
      const allowed = limitBytes <= 0 ? true : projected <= limitBytes;
      return Response.json({ allowed, current_bytes: record.total_bytes || 0, limit_bytes: limitBytes, projected_bytes: projected });
    }
    if (action === "add") {
      const projected = (record.total_bytes || 0) + size;
      const { data: updated } = await supabaseAdmin.from("storage_usage").update({ total_bytes: projected, file_count: (record.file_count || 0) + 1 }).eq("id", record.id).select("*").single();
      return Response.json({ allowed: true, total_bytes: updated.total_bytes, file_count: updated.file_count, limit_bytes: limitBytes });
    }
    if (action === "remove") {
      const newBytes = Math.max(0, (record.total_bytes || 0) - size);
      const newCount = Math.max(0, (record.file_count || 0) - 1);
      const { data: updated } = await supabaseAdmin.from("storage_usage").update({ total_bytes: newBytes, file_count: newCount }).eq("id", record.id).select("*").single();
      return Response.json({ total_bytes: updated.total_bytes, file_count: updated.file_count, limit_bytes: limitBytes });
    }
    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
