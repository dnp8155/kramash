// Plan utilities — shared constants and helpers.
export const PLAN_CODES = {
  FREE: "FREE",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE"
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED"
};

export const BILLING_CYCLES = ["MONTHLY", "SIX_MONTHS", "ANNUAL"];

export function parseLimitValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  const n = Number(value);
  return isNaN(n) ? value : n;
}

export function isPlanActive(subscription) {
  if (!subscription) return false;
  if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) return false;
  if (subscription.expires_at) {
    const expiry = new Date(subscription.expires_at);
    if (expiry.getTime() < Date.now()) return false;
  }
  return true;
}

export function isProPlan(subscription) {
  return isPlanActive(subscription) && subscription?.plan_id === PLAN_CODES.PRO;
}

export async function resolveWorkspacePlan(base44, workspaceId) {
  const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
    { workspace_id: workspaceId, status: SUBSCRIPTION_STATUS.ACTIVE }, "-started_at", 1
  );
  const sub = subs && subs[0];
  if (!sub) return { plan_code: PLAN_CODES.FREE, subscription: null, is_pro: false, is_active: true };

  const active = isPlanActive(sub);
  if (!active) return { plan_code: PLAN_CODES.FREE, subscription: sub, is_pro: false, is_active: false };

  return {
    plan_code: sub.plan_id || PLAN_CODES.FREE,
    subscription: sub,
    is_pro: sub.plan_id === PLAN_CODES.PRO,
    is_active: true
  };
}