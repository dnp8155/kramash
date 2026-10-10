import { Crown, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import Button from "@/components/common/Button";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { useT } from "@/hooks/useT";

export default function ProGate({
  featureLabel,
  resource,
  currentUsage = 0,
  limit = 0,
  compact = false,
  children,
}) {
  const t = useT();
  const { workspace } = useWorkspace();
  const { plan, loading } = usePlan({ loadUsage: false });

  if (loading) return children;

  const isPro = plan ? plan.planCode === "PRO" : workspace?.plan_type === "pro";

  if (isPro) return children;

  if (featureLabel) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-warning/20 bg-warning/5 text-xs">
          <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-muted-foreground">{t("{feature} requires Pro").replace("{feature}", featureLabel)}</span>
          <Link to="/plan" className="font-semibold text-warning underline ml-auto">{t("Upgrade")}</Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-center p-6 rounded-xl border border-warning/20 bg-warning/5">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-warning" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {t("{feature} is a Pro feature").replace("{feature}", featureLabel)}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {t("Upgrade to Kramasha Pro to access {feature} and other premium capabilities.").replace("{feature}", featureLabel.toLowerCase())}
        </p>
        <Link to="/plan" className="mt-4">
          <Button variant="primary" size="sm">
            <Crown className="w-3.5 h-3.5" /> {t("View Pro Plans")}
          </Button>
        </Link>
      </div>
    );
  }

  const overLimit = limit > 0 && currentUsage >= limit;
  if (!overLimit) return children;

  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl border border-warning/20 bg-warning/5">
      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
        <Crown className="w-6 h-6 text-warning" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {t("Free plan {resource} limit reached").replace("{resource}", resource)}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {t("{used} / {limit} {resource} used. Upgrade to Pro for unlimited {resource}.").replace("{used}", currentUsage).replace("{limit}", limit).split("{resource}").join(resource)}
      </p>
      <Link to="/plan" className="mt-4">
        <Button variant="primary" size="sm">
          <Crown className="w-3.5 h-3.5" /> {t("Upgrade to Pro")}
        </Button>
      </Link>
    </div>
  );
}

export function useProGate() {
  const { workspace } = useWorkspace();
  const { plan, loading } = usePlan({ loadUsage: false });
  const isPro = plan ? plan.planCode === "PRO" : workspace?.plan_type === "pro";
  return { isPro, canAccess: isPro, loading };
}

export function useFeatureGate() {
  const { workspace } = useWorkspace();
  const { plan, loading } = usePlan({ loadUsage: false });
  const [gate, setGate] = useState(null);
  const isPro = plan ? plan.planCode === "PRO" : workspace?.plan_type === "pro";

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