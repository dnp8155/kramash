import { base44 } from "@/api/base44Client";

// Limit keys that are boolean feature flags vs numeric resource caps.
const BOOLEAN_KEYS = new Set(["pdf_export_enabled", "reminders_enabled"]);
const UNLIMITED = 999999;

let planConfigCache = null;

// Load the global plan/pricing/limit configuration (readable by all authenticated users).
export async function loadPlanConfig(force = false) {
  if (planConfigCache && !force) return planConfigCache;
  const [plans, pricings, allLimits] = await Promise.all([
    base44.entities.Plan.list(),
    base44.entities.PlanPricing.list(),
    base44.entities.PlanLimit.list()
  ]);
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
  return {
    planCode,
    planStatus,
    isExpired,
    expiresAt,
    subscription,
    limits,
    plans: config.plans,
    pricings: config.pricings
  };
}

// Count real usage from database records.
export async function getUsage(workspaceId) {
  const [events, members, services] = await Promise.all([
    base44.entities.Event.filter({ workspace_id: workspaceId }),
    base44.entities.TeamMember.filter({ workspace_id: workspaceId, status: "active" }),
    base44.entities.Service.filter({ workspace_id: workspaceId, status: "active" })
  ]);
  return {
    events: events.length,
    team_members: members.length,
    services: services.length
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