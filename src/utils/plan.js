// Shared plan/subscription helpers used by admin pages and the Your Plan page.

export const UNLIMITED = 999999;

// Find the latest subscription for a workspace (any status, sorted by created_date desc).
export function getCurrentSubscription(subscriptions, workspaceId) {
  const subs = (subscriptions || [])
    .filter((s) => s.workspace_id === workspaceId)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  return subs[0] || null;
}

// Determine the effective plan code, accounting for expiry and suspension.
export function getEffectivePlanCode(sub) {
  if (!sub) return "FREE";
  if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(sub.status)) return "FREE";
  if (sub.status === "ACTIVE" && sub.expires_at) {
    const now = new Date().toISOString().slice(0, 10);
    if (sub.expires_at < now) return "FREE";
  }
  return sub.plan_code_snapshot || "FREE";
}

// Check if a subscription is effectively active (not expired/suspended).
export function isSubscriptionActive(sub) {
  if (!sub) return false;
  if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(sub.status)) return false;
  if (sub.status === "ACTIVE" && sub.expires_at) {
    const now = new Date().toISOString().slice(0, 10);
    if (sub.expires_at < now) return false;
  }
  return true;
}

// Build a limits map from PlanLimit records for a given plan.
export function buildLimitsMap(allLimits, planId) {
  const map = {};
  for (const l of allLimits || []) {
    if (l.enabled && l.plan_id === planId) {
      map[l.limit_key] = l.limit_value;
    }
  }
  return map;
}

// Format a limit value for display (Infinity → "Unlimited").
export function formatLimit(value) {
  if (value === undefined || value === null) return "—";
  if (value >= UNLIMITED) return "Unlimited";
  return String(value);
}

// Resource limit keys mapped to display labels.
export const RESOURCE_LABELS = {
  max_events: "Events",
  max_team_members: "Team Members",
  max_services: "Services",
};

// Feature flag keys mapped to display labels.
export const FEATURE_LABELS = {
  quotation_enabled: "Quotations",
  pdf_export_enabled: "PDF Export",
  advanced_theme_enabled: "Advanced Themes",
  reminders_enabled: "Reminders",
};