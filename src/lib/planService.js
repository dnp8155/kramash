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

// Admin users exempt from plan limits — they get full Pro access without
// needing an active subscription. Only these specific emails are exempt.
const EXEMPT_ADMIN_EMAILS = new Set([
  "ns51@dipakpatel.site",
  "krishnashahphotography@gmail.com"
]);

let planConfigCache = null;

// Check if the current logged-in user is an exempt admin (by email).
async function isCurrentUserExempt() {
  try {
    const me = await base44.auth.me();
    const email = (me?.email || "").toLowerCase().trim();
    return EXEMPT_ADMIN_EMAILS.has(email);
  } catch {
    return false;
  }
}

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
  const [subs, isExempt] = await Promise.all([
    base44.entities.WorkspaceSubscription.filter(
      { workspace_id: workspaceId },
      "-created_date",
      50
    ),
    isCurrentUserExempt()
  ]);
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

  // Exempt admin users get full Pro access regardless of subscription status.
  if (isExempt) {
    planCode = "PRO";
    planStatus = "active";
    isExpired = false;
  }

  // For Pro users, ensure ALL boolean feature flags default to true even if
  // the Pro plan limits row is missing from the database. This prevents
  // features like Link Sharing, Client Portal, Team Portal from being
  // disabled for legitimate Pro subscribers due to missing config rows.
  const rawLimits = isExempt
    ? {
        // Exempt admins get every numeric limit as unlimited and every
        // boolean feature flag enabled, regardless of what PRO defines.
        ...Object.fromEntries(
          Object.keys(config.limitsByPlan["PRO"] || {}).map((k) => [
            k,
            BOOLEAN_KEYS.has(k) ? true : UNLIMITED
          ])
        ),
        max_events: UNLIMITED,
        max_team_members: UNLIMITED,
        max_services: UNLIMITED,
        max_storage_gb: UNLIMITED,
        max_leads: UNLIMITED,
        pdf_export_enabled: true,
        reminders_enabled: true,
        notifications_enabled: true,
        link_sharing_enabled: true,
        client_portal_enabled: true,
        team_portal_enabled: true,
        excel_csv_export_enabled: true,
        event_display_customization_enabled: true,
        quotation_logo_enabled: true
      }
    : (config.limitsByPlan[planCode] || {});

  // Pro users: fill in any missing boolean feature flags as `true`.
  // This handles the case where the Pro plan_limits rows don't exist
  // in the database but the user has an active Pro subscription.
  const limits = (planCode === "PRO" || isExempt)
    ? {
        ...rawLimits,
        pdf_export_enabled: rawLimits.pdf_export_enabled ?? true,
        reminders_enabled: rawLimits.reminders_enabled ?? true,
        notifications_enabled: rawLimits.notifications_enabled ?? true,
        link_sharing_enabled: rawLimits.link_sharing_enabled ?? true,
        client_portal_enabled: rawLimits.client_portal_enabled ?? true,
        team_portal_enabled: rawLimits.team_portal_enabled ?? true,
        excel_csv_export_enabled: rawLimits.excel_csv_export_enabled ?? true,
        event_display_customization_enabled: rawLimits.event_display_customization_enabled ?? true,
        quotation_logo_enabled: rawLimits.quotation_logo_enabled ?? true,
      }
    : rawLimits;

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