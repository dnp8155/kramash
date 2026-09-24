import { useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * usePlan — loads workspace plan config and (optionally) usage counts.
 *
 * @param {Object} opts
 * @param {boolean} opts.loadUsage — set false to skip the 4-call usage
 *   count query (use by feature-gate-only consumers that never call
 *   canCreate). Defaults to true.
 */
export function usePlan({ loadUsage = true } = {}) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  // Plan + limits — cached for 2 minutes (rarely changes).
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", workspaceId],
    queryFn: () => resolveWorkspacePlan(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Usage counts — cached for 60s (changes when user creates entities).
  // Only fetched when loadUsage is true — feature-gate consumers skip it.
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["plan-usage", workspaceId],
    queryFn: () => getUsage(workspaceId),
    enabled: !!workspaceId && loadUsage,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const loading = planLoading || (loadUsage && usageLoading);

  const canCreate = (key) => {
    if (!plan || !usage) return { allowed: true, limit: Infinity };
    const usageKey = USAGE_KEY_MAP[key] || key;
    return canCreateResource(plan.limits, key, usage[usageKey] || 0);
  };

  const canUse = (key) => (plan ? canUseFeature(plan.limits, key) : false);

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["plan", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["plan-usage", workspaceId] });
  };

  return { plan, usage, loading, reload, canCreate, canUse, clearCache: clearPlanConfigCache };
}