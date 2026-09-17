import { useState, useEffect, useCallback } from "react";
import {
  resolveWorkspacePlan,
  getUsage,
  canCreateResource,
  canUseFeature,
  clearPlanConfigCache
} from "@/lib/planService";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Maps plan limit keys (stored in PlanLimit.limit_key) to usage keys
// returned by getUsage(). Without this, canCreate("max_team_members")
// would look up usage["max_team_members"] (undefined) instead of
// usage["team_members"], making the limit check always pass.
const USAGE_KEY_MAP = {
  max_team_members: "team_members",
  max_events: "events",
  max_services: "services",
  max_leads: "leads",
};

export function usePlan() {
  const { workspaceId } = useWorkspace();
  const [plan, setPlan] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setPlan(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, u] = await Promise.all([resolveWorkspacePlan(workspaceId), getUsage(workspaceId)]);
      setPlan(p);
      setUsage(u);
    } catch (e) {
      setPlan(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = (key) => {
    if (!plan || !usage) return { allowed: true, limit: Infinity };
    const usageKey = USAGE_KEY_MAP[key] || key;
    return canCreateResource(plan.limits, key, usage[usageKey] || 0);
  };

  const canUse = (key) => (plan ? canUseFeature(plan.limits, key) : false);

  return { plan, usage, loading, reload: load, canCreate, canUse, clearCache: clearPlanConfigCache };
}