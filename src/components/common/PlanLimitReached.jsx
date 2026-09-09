import { Lock, ArrowUpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import { usePlan } from "@/lib/PlanContext";

// Reusable upgrade/limit-reached state shown when a Free workspace hits a plan limit.
export default function PlanLimitReached({
  resource = "resource",
  currentUsage = 0,
  limit = 0,
  requiredPlan = "Pro",
  title,
  description,
  showActions = true,
}) {
  const navigate = useNavigate();
  const { planName } = usePlan();

  const defaultTitle = title || `You've reached the ${planName} plan ${resource} limit`;
  const defaultDesc =
    description ||
    `You're using ${currentUsage} of ${limit >= 999999 ? "∞" : limit} ${resource}. Upgrade to Kramashah ${requiredPlan} to create more.`;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-accent/30 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{defaultTitle}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{defaultDesc}</p>
      </div>
      {showActions && (
        <Button size="sm" onClick={() => navigate("/plan")} className="mt-1">
          <ArrowUpCircle className="h-4 w-4" /> View {requiredPlan} Plans
        </Button>
      )}
    </div>
  );
}