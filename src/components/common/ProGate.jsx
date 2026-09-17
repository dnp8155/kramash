import { Crown, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import Button from "@/components/common/Button";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { cn } from "@/lib/utils";

/**
 * ProGate — wraps children and shows an upgrade prompt if the workspace
 * is on the Free plan. Use `featureLabel` for feature-based gating (boolean
 * features like portal links, custom templates) or `resource`/`limit` for
 * resource-count gating (events, team members, services).
 *
 * Props:
 *  - featureLabel: string — name of the PRO feature (e.g. "Client Portal")
 *  - resource: string — resource name for count-based limits (e.g. "events")
 *  - currentUsage: number — current usage count
 *  - limit: number — max allowed on free plan
 *  - compact: boolean — smaller inline variant
 *  - children: gated content (only rendered when access is allowed)
 */
export default function ProGate({
  featureLabel,
  resource,
  currentUsage = 0,
  limit = 0,
  compact = false,
  children,
}) {
  const { workspace } = useWorkspace();
  const { plan, loading } = usePlan({ loadUsage: false });

  // While plan is loading, render children to avoid flash of locked UI
  if (loading) return children;

  const isPro = plan?.planCode === "PRO" || workspace?.plan_type === "pro";

  if (isPro) return children;

  // Feature-based gating (boolean feature flag)
  if (featureLabel) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-warning/20 bg-warning/5 text-xs">
          <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-muted-foreground">{featureLabel} requires Pro</span>
          <Link to="/plan" className="font-semibold text-warning underline ml-auto">Upgrade</Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-center p-6 rounded-xl border border-warning/20 bg-warning/5">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-warning" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {featureLabel} is a Pro feature
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Upgrade to Kramasha Pro to access {featureLabel.toLowerCase()} and other premium capabilities.
        </p>
        <Link to="/plan" className="mt-4">
          <Button variant="primary" size="sm">
            <Crown className="w-3.5 h-3.5" /> View Pro Plans
          </Button>
        </Link>
      </div>
    );
  }

  // Resource-count-based gating
  const overLimit = limit > 0 && currentUsage >= limit;
  if (!overLimit) return children;

  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl border border-warning/20 bg-warning/5">
      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
        <Crown className="w-6 h-6 text-warning" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        Free plan {resource} limit reached
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {currentUsage} / {limit} {resource} used. Upgrade to Pro for unlimited {resource}.
      </p>
      <Link to="/plan" className="mt-4">
        <Button variant="primary" size="sm">
          <Crown className="w-3.5 h-3.5" /> Upgrade to Pro
        </Button>
      </Link>
    </div>
  );
}

/**
 * useProGate — hook that returns whether a feature is accessible.
 * Returns { isPro, canAccess, loading }.
 */
export function useProGate() {
  const { workspace } = useWorkspace();
  const { plan, loading } = usePlan({ loadUsage: false });
  const isPro = plan?.planCode === "PRO" || workspace?.plan_type === "pro";
  return { isPro, canAccess: isPro, loading };
}

/**
 * useFeatureGate — hook for gating PRO-only boolean features.
 * Returns { isPro, checkFeature, FeatureGateDialog, loading }.
 * Call checkFeature("limit_key", "Feature Label") before performing the gated action.
 * If the feature is not allowed, it opens an upgrade dialog and returns false.
 * Render {FeatureGateDialog} somewhere in your component JSX.
 */
export function useFeatureGate() {
  // Feature gates only need the plan config, not usage counts — skip the
  // 4-call usage query to reduce API load on feature-gated pages.
  const { plan, loading } = usePlan({ loadUsage: false });
  const [gate, setGate] = useState(null);
  const isPro = plan?.planCode === "PRO";

  const checkFeature = (key, label) => {
    if (loading) return false;
    if (isPro || plan?.limits?.[key]) return true;
    setGate({ featureLabel: label });
    return false;
  };

  const FeatureGateDialog = (
    <PlanLimitDialog
      open={!!gate}
      onClose={() => setGate(null)}
      featureLabel={gate?.featureLabel}
    />
  );

  return { isPro, checkFeature, FeatureGateDialog, loading };
}