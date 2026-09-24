// Shared plan-resolution + limit-enforcement logic.
// Ported from supabase/functions/_shared/planEngine.ts.
import { getSupabaseAdmin } from "./supabaseAdmin.js";

export const PLAN_CODES = { FREE: "FREE", PRO: "PRO" };
export const SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };

export const BOOLEAN_LIMIT_KEYS = new Set([
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

export const UNLIMITED = 999999;

export function parseLimitValue(key, rawValue) {
  if (BOOLEAN_LIMIT_KEYS.has(key)) return String(rawValue) === "true";
  const n = parseInt(String(rawValue), 10);
  return isNaN(n) ? UNLIMITED : n;
}

export function computeExpiry(startDateStr, durationMonths) {
  const d = new Date(startDateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().split("T")[0];
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export async function verifyWorkspaceMembership(userId, workspaceId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: memberships } = await supabaseAdmin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .limit(1);
  if (memberships && memberships.length > 0) return true;

  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .single();
  if (ws && ws.owner_user_id === userId) return true;

  return false;
}

export async function resolvePlanContext(workspaceId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: subs } = await supabaseAdmin
    .from("workspace_subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  const activeSub = (subs && subs.find((s) => s.status === SUB_STATUS.ACTIVE)) || (subs && subs[0]) || null;

  let planCode = PLAN_CODES.FREE;
  let planStatus = "free";
  let isExpired = false;
  let expiresAt = null;
  let subscription = activeSub;

  if (activeSub) {
    if (activeSub.plan_id) {
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("*")
        .eq("id", activeSub.plan_id)
        .single();
      if (plan) planCode = plan.code;
    }
    if (activeSub.expires_at) {
      const exp = new Date(activeSub.expires_at + "T00:00:00");
      if (exp < new Date() && activeSub.status === SUB_STATUS.ACTIVE) isExpired = true;
    }
    if (isExpired) {
      planCode = PLAN_CODES.FREE;
      planStatus = "expired";
    } else {
      planStatus = (activeSub.status || "active").toLowerCase();
    }
    expiresAt = activeSub.expires_at || null;
  }

  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("code", planCode);
  const planRecord = (plans && plans[0]) || null;

  let limits = {};
  if (planRecord) {
    const { data: planLimits } = await supabaseAdmin
      .from("plan_limits")
      .select("*")
      .eq("plan_id", planRecord.id)
      .eq("enabled", true);
    for (const pl of planLimits || []) {
      limits[pl.limit_key] = parseLimitValue(pl.limit_key, pl.limit_value);
    }
  }

  let storageGb = limits.max_storage_gb || 0;
  if (activeSub && activeSub.pricing_id && !isExpired) {
    const { data: pricing } = await supabaseAdmin
      .from("plan_pricings")
      .select("*")
      .eq("id", activeSub.pricing_id)
      .single();
    if (pricing && typeof pricing.storage_gb === "number") storageGb = pricing.storage_gb;
  }

  return { planCode, planStatus, isExpired, expiresAt, subscription, limits, planRecord, storageGb };
}

export async function countUsage(workspaceId, resourceKey) {
  const supabaseAdmin = getSupabaseAdmin();
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

export function checkResourceLimit(limits, resourceKey, currentUsage) {
  const limit = limits[resourceKey];
  if (limit === undefined || limit === null) return { allowed: true, limit: UNLIMITED, current: currentUsage };
  if (limit >= UNLIMITED) return { allowed: true, limit: UNLIMITED, current: currentUsage };
  return { allowed: currentUsage < limit, limit, current: currentUsage };
}