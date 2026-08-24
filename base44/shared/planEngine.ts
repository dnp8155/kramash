// Shared plan-resolution + limit-enforcement logic for backend functions.
// Imported by createEvent/createTeamMember/createService and admin functions.

export const PLAN_CODES = { FREE: "FREE", PRO: "PRO" };
export const SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };

export const BOOLEAN_LIMIT_KEYS = new Set(["pdf_export_enabled", "reminders_enabled"]);

// "Unlimited" sentinel — any limit >= this is treated as no cap.
export const UNLIMITED = 999999;

export function parseLimitValue(key, rawValue) {
  if (BOOLEAN_LIMIT_KEYS.has(key)) return String(rawValue) === "true";
  const n = parseInt(String(rawValue), 10);
  return isNaN(n) ? UNLIMITED : n;
}

// Compute expiry date from a YYYY-MM-DD start and a duration in months (calendar-month arithmetic).
export function computeExpiry(startDateStr, durationMonths) {
  const d = new Date(startDateStr + "T00:00:00");
  const exp = new Date(d.getFullYear(), d.getMonth() + durationMonths, d.getDate());
  return exp.toISOString().split("T")[0];
}

export async function verifyWorkspaceMembership(base44, userId, workspaceId) {
  const memberships = await base44.entities.WorkspaceMember.filter({
    workspace_id: workspaceId,
    user_id: userId
  });
  return !!(memberships && memberships.length > 0);
}

// Resolve the effective plan + limits for a workspace (service-role reads, bypasses RLS).
export async function resolvePlanContext(base44, workspaceId) {
  const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
    { workspace_id: workspaceId },
    "-created_date",
    50
  );
  const activeSub = (subs && subs.find((s) => s.status === SUB_STATUS.ACTIVE)) || (subs && subs[0]) || null;

  let planCode = PLAN_CODES.FREE;
  let planStatus = "free";
  let isExpired = false;
  let expiresAt = null;
  let subscription = activeSub;

  if (activeSub) {
    if (activeSub.plan_id) {
      try {
        const plan = await base44.asServiceRole.entities.Plan.get(activeSub.plan_id);
        if (plan) planCode = plan.code;
      } catch (e) { /* plan may have been removed */ }
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

  const plans = await base44.asServiceRole.entities.Plan.filter({ code: planCode });
  const planRecord = (plans && plans[0]) || null;

  let limits = {};
  if (planRecord) {
    const planLimits = await base44.asServiceRole.entities.PlanLimit.filter({
      plan_id: planRecord.id,
      enabled: true
    });
    for (const pl of planLimits) {
      limits[pl.limit_key] = parseLimitValue(pl.limit_key, pl.limit_value);
    }
  }

  return { planCode, planStatus, isExpired, expiresAt, subscription, limits, planRecord };
}

export async function countUsage(base44, workspaceId, resourceKey) {
  switch (resourceKey) {
    case "max_events": {
      const events = await base44.asServiceRole.entities.Event.filter({ workspace_id: workspaceId });
      return events.length;
    }
    case "max_team_members": {
      const members = await base44.asServiceRole.entities.TeamMember.filter({
        workspace_id: workspaceId,
        status: "active"
      });
      return members.length;
    }
    case "max_services": {
      const services = await base44.asServiceRole.entities.Service.filter({
        workspace_id: workspaceId,
        status: "active"
      });
      return services.length;
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