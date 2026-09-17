import { base44 } from "@/api/base44Client";
import { staggeredAllSettled } from "@/lib/staggeredLoader";

// Limit keys that are boolean feature flags vs numeric resource caps.
const BOOLEAN_KEYS = new Set([
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
const UNLIMITED = 999999;

let planConfigCache = null;

// Load the global plan/pricing/limit configuration (readable by all authenticated users).
export async function loadPlanConfig(force = false) {
  if (planConfigCache && !force) return planConfigCache;
  // Sequential (waveSize=1) — avoids 3-call concurrent burst that triggers
  // 429 rate limits when this fires alongside page data queries on mount.
  const [plansR, pricingsR, allLimitsR] = await staggeredAllSettled([
    () => base44.entities.Plan.list(),
    () => base44.entities.PlanPricing.list(),
    () => base44.entities.PlanLimit.list()
  ], { waveSize: 1, waveDelay: 150 });
  const plans = plansR.status === "fulfilled" ? plansR.value : [];
  const pricings = pricingsR.status === "fulfilled" ? pricingsR.value : [];
  const allLimits = allLimitsR.status === "fulfilled" ? allLimitsR.value : [];
  const limitsByPlan = {};
  for (const pl of allLimits) {
    if (!pl.enabled) continue;
    const plan = plans.find((p) => p.id === pl.plan_id);
    if (!plan) continue;
    if (!limitsByPlan[plan.code]) limitsByPlan[plan.code] = {};
    limitsByPlan[plan.code][pl.limit_key] = BOOLEAN_KEYS.has(pl.limit_key)
      ? String(pl.limit_value) === "true"
      : parseInt(String(pl.limit_value), 10);
  }
  planConfigCache = { plans, pricings, limitsByPlan };
  return planConfigCache;
}

export function clearPlanConfigCache() {
  planConfigCache = null;
}

// Resolve the effective plan + limits for a workspace (checks expiry at resolution time).
export async function resolveWorkspacePlan(workspaceId) {
  const config = await loadPlanConfig();
  const subs = await base44.entities.WorkspaceSubscription.filter(
    { workspace_id: workspaceId },
    "-created_date",
    50
  );
  const activeSub = (subs && subs.find((s) => s.status === "ACTIVE")) || (subs && subs[0]) || null;

  let planCode = "FREE";
  let planStatus = "free";
  let isExpired = false;
  let expiresAt = null;
  let subscription = activeSub;

  if (activeSub) {
    const plan = config.plans.find((p) => p.id === activeSub.plan_id);
    if (plan) planCode = plan.code;
    if (activeSub.expires_at) {
      const exp = new Date(activeSub.expires_at + "T00:00:00");
      if (exp < new Date() && activeSub.status === "ACTIVE") isExpired = true;
    }
    if (isExpired) {
      planCode = "FREE";
      planStatus = "expired";
    } else {
      planStatus = (activeSub.status || "active").toLowerCase();
    }
    expiresAt = activeSub.expires_at || null;
  }

  const limits = config.limitsByPlan[planCode] || {};

  // Resolve per-billing-cycle storage from the active subscription's pricing.
  let storageGb = limits.max_storage_gb || 0;
  if (activeSub && activeSub.pricing_id && !isExpired) {
    const subPricing = config.pricings.find((p) => p.id === activeSub.pricing_id);
    if (subPricing && typeof subPricing.storage_gb === "number") {
      storageGb = subPricing.storage_gb;
    }
  }

  return {
    planCode,
    planStatus,
    isExpired,
    expiresAt,
    subscription,
    limits,
    storageGb,
    plans: config.plans,
    pricings: config.pricings
  };
}

// Count real usage from database records.
// Uses staggered loading to avoid 429 rate limits from concurrent calls.
export async function getUsage(workspaceId) {
  const [evR, mbR, svR, ldR] = await staggeredAllSettled([
    () => base44.entities.Event.filter({ workspace_id: workspaceId }),
    () => base44.entities.TeamMember.filter({ workspace_id: workspaceId, status: "active" }),
    () => base44.entities.Service.filter({ workspace_id: workspaceId, status: "active" }),
    () => base44.entities.Lead.filter({ workspace_id: workspaceId })
  ], { waveSize: 1, waveDelay: 200 });
  return {
    events: evR.status === "fulfilled" ? (evR.value || []).length : 0,
    team_members: mbR.status === "fulfilled" ? (mbR.value || []).length : 0,
    services: svR.status === "fulfilled" ? (svR.value || []).length : 0,
    leads: ldR.status === "fulfilled" ? (ldR.value || []).length : 0
  };
}

export function canCreateResource(limits, key, currentUsage) {
  const limit = limits[key];
  if (limit === undefined || limit === null) return { allowed: true, limit: UNLIMITED };
  if (limit >= UNLIMITED) return { allowed: true, limit: UNLIMITED };
  return { allowed: currentUsage < limit, limit };
}

export function canUseFeature(limits, key) {
  return !!limits[key];
}

export const PLAN_UNLIMITED = UNLIMITED;