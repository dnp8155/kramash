// Shared plan/subscription resolution logic used by multiple backend functions.
// Import as: import { ... } from "../../shared/planUtils.ts";

export const UNLIMITED = 999999;

export const RESOURCE_TYPES = ["events", "team_members", "services"];

export const LIMIT_KEY_MAP = {
  events: "max_events",
  team_members: "max_team_members",
  services: "max_services",
};

// Add calendar months to a date-only ISO string, handling day overflow.
export function computeExpiry(startDate: string, durationMonths: number): string {
  const d = new Date(startDate + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  // If the day overflowed (e.g. Jan 31 + 1 month = Mar 3), clamp to last day of target month
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Find the latest ACTIVE or SUSPENDED subscription for a workspace.
// Auto-expires it if past the expiry date.
export async function resolveActiveSubscription(base44, workspaceId: string) {
  const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
    { workspace_id: workspaceId, status: { $in: ["ACTIVE", "SUSPENDED"] } },
    "-created_date",
    5
  );
  if (!subs || subs.length === 0) return null;
  const sub = subs[0];

  // Auto-expire if past expiry date
  if (sub.status === "ACTIVE" && sub.expires_at) {
    const now = todayStr();
    if (sub.expires_at < now) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(sub.id, {
        status: "EXPIRED",
        reason: "Auto-expired (date check)",
      });
      return { ...sub, status: "EXPIRED" };
    }
  }
  return sub;
}

// Fetch all PlanLimit rows for a plan and return as a key→value map.
export async function getPlanLimits(base44, planId: string): Promise<Record<string, number>> {
  const limits = await base44.asServiceRole.entities.PlanLimit.filter(
    { plan_id: planId, enabled: true },
    "limit_key",
    100
  );
  const map: Record<string, number> = {};
  for (const l of limits || []) {
    map[l.limit_key] = l.limit_value;
  }
  return map;
}

export async function getPlanByCode(base44, code: string) {
  const plans = await base44.asServiceRole.entities.Plan.filter(
    { code, is_active: true },
    "sort_order",
    1
  );
  return plans && plans.length > 0 ? plans[0] : null;
}

export async function getPlanById(base44, planId: string) {
  return await base44.asServiceRole.entities.Plan.get(planId);
}

export async function getPricingById(base44, pricingId: string) {
  return await base44.asServiceRole.entities.PlanPricing.get(pricingId);
}

// Count current active resource usage for a workspace.
export async function countResourceUsage(base44, workspaceId: string, resourceType: string): Promise<number> {
  if (resourceType === "events") {
    const all = await base44.asServiceRole.entities.Event.filter(
      { workspace_id: workspaceId },
      "-created_date",
      1000
    );
    return (all || []).length;
  }
  if (resourceType === "team_members") {
    const all = await base44.asServiceRole.entities.TeamMember.filter(
      { workspace_id: workspaceId, status: "Active" },
      "-created_date",
      1000
    );
    return (all || []).length;
  }
  if (resourceType === "services") {
    const all = await base44.asServiceRole.entities.Service.filter(
      { workspace_id: workspaceId, status: "active" },
      "name",
      1000
    );
    return (all || []).length;
  }
  return 0;
}

export function isLimitExceeded(currentUsage: number, limit: number): boolean {
  if (limit >= UNLIMITED) return false;
  return currentUsage >= limit;
}

export function isFeatureEnabled(limits: Record<string, number>, key: string): boolean {
  return (limits[key] ?? 0) >= 1;
}

// Verify the calling user is a member of the workspace.
export async function verifyWorkspaceMembership(base44, userId: string, workspaceId: string): Promise<boolean> {
  const members = await base44.asServiceRole.entities.WorkspaceMember.filter(
    { user_id: userId, workspace_id: workspaceId, status: "active" },
    "-created_date",
    1
  );
  return members && members.length > 0;
}

// Resolve the effective plan code for a subscription (handles expired Pro → Free fallback).
export function getEffectivePlanCode(subscription: any): string {
  if (!subscription) return "FREE";
  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") return "FREE";
  if (subscription.status === "SUSPENDED") return "FREE";
  return subscription.plan_code_snapshot || "FREE";
}