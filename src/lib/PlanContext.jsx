import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

const PlanContext = createContext(null);

const UNLIMITED = 999999;

// Determine the effective plan code from a subscription (expired/suspended → Free fallback)
function getEffectivePlanCode(subscription) {
  if (!subscription) return "FREE";
  if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(subscription.status)) return "FREE";
  return subscription.plan_code_snapshot || "FREE";
}

export const PlanProvider = ({ children }) => {
  const { workspaceId, currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [limits, setLimits] = useState({});
  const [usage, setUsage] = useState({ events: 0, team_members: 0, services: 0 });
  const [error, setError] = useState(null);

  const resolve = useCallback(async () => {
    if (!workspaceId) {
      setSubscription(null);
      setPlan(null);
      setLimits({});
      setUsage({ events: 0, team_members: 0, services: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch subscription + all plans + all limits in parallel
      const [subs, allPlans, allLimits] = await Promise.all([
        base44.entities.WorkspaceSubscription.filter(
          { workspace_id: workspaceId, status: { $in: ["ACTIVE", "SUSPENDED", "EXPIRED"] } },
          "-created_date",
          5
        ),
        base44.entities.Plan.list(),
        base44.entities.PlanLimit.list(),
      ]);

      let currentSub = (subs && subs[0]) || null;

      // Auto-expire check (client-side; backend also does this)
      if (currentSub && currentSub.status === "ACTIVE" && currentSub.expires_at) {
        const now = new Date().toISOString().slice(0, 10);
        if (currentSub.expires_at < now) {
          currentSub = { ...currentSub, status: "EXPIRED" };
        }
      }

      // Determine effective plan
      const effectivePlanCode = getEffectivePlanCode(currentSub);
      const effectivePlan = (allPlans || []).find((p) => p.code === effectivePlanCode)
        || (allPlans || []).find((p) => p.code === "FREE");

      // Build limits map for the effective plan
      const planLimits = {};
      for (const l of allLimits || []) {
        if (l.enabled && l.plan_id === effectivePlan?.id) {
          planLimits[l.limit_key] = l.limit_value;
        }
      }

      setSubscription(currentSub);
      setPlan(effectivePlan);
      setLimits(planLimits);

      // Fetch usage counts in parallel
      const [events, members, services] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId, status: "Active" }, "-created_date", 1000),
        base44.entities.Service.filter({ workspace_id: workspaceId, status: "active" }, "name", 1000),
      ]);
      setUsage({
        events: (events || []).length,
        team_members: (members || []).length,
        services: (services || []).length,
      });
    } catch (e) {
      setError(e?.message || "Failed to load plan data");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  // ─── Helper functions ───

  const getLimit = useCallback(
    (key) => {
      const val = limits[key];
      if (val === undefined) return null;
      return val >= UNLIMITED ? Infinity : val;
    },
    [limits]
  );

  const canCreateResource = useCallback(
    (resourceType) => {
      const keyMap = { events: "max_events", team_members: "max_team_members", services: "max_services" };
      const limitKey = keyMap[resourceType];
      if (!limitKey) return true;
      const limit = limits[limitKey];
      if (limit === undefined) return true;
      if (limit >= UNLIMITED) return true;
      return (usage[resourceType] || 0) < limit;
    },
    [limits, usage]
  );

  const canUseFeature = useCallback(
    (featureKey) => {
      const val = limits[featureKey];
      return val !== undefined && val >= 1;
    },
    [limits]
  );

  const isPro = (plan?.code === "PRO" && subscription?.status === "ACTIVE");
  const isSuspended = subscription?.status === "SUSPENDED" || currentWorkspace?.plan_status === "suspended";
  const isExpired = subscription?.status === "EXPIRED";

  const value = {
    loading,
    error,
    subscription,
    plan,
    planCode: plan?.code || "FREE",
    planName: plan?.name || "Free",
    limits,
    usage,
    isPro,
    isFree: !isPro,
    isSuspended,
    isExpired,
    subscriptionStatus: subscription?.status || "NONE",
    expiresAt: subscription?.expires_at || null,
    startedAt: subscription?.started_at || null,
    getLimit,
    canCreateResource,
    canUseFeature,
    refresh: resolve,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
};