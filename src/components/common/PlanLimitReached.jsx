import { Crown, Lock } from "lucide-react";
import Button from "@/components/common/Button";
import { Link } from "react-router-dom";
import { useT } from "@/hooks/useT";

export default function PlanLimitReached({
  resource = "resource",
  currentUsage = 0,
  limit = 0,
  requiredPlan = "Pro",
  featureLabel
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border border-amber-200 bg-amber-50/60">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
        {featureLabel ? <Lock className="w-6 h-6 text-amber-600" /> : <Crown className="w-6 h-6 text-amber-600" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {featureLabel
          ? t("{feature} is a {plan} feature").replace("{feature}", featureLabel).replace("{plan}", requiredPlan)
          : t("You've reached the Free Plan {resource} limit").replace("{resource}", resource)}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {featureLabel
          ? t("Upgrade to Kramasha {plan} to access {feature}.").replace("{plan}", requiredPlan).replace("{feature}", featureLabel.toLowerCase())
          : t("{used} / {limit} {resource} used. Upgrade to Kramasha {plan} to create more {resource}.").replace("{used}", currentUsage).replace("{limit}", limit).split("{resource}").join(resource).replace("{plan}", requiredPlan)}
      </p>
      <Link to="/plan" className="mt-4">
        <Button variant="primary" size="sm">{t("View Pro Plans")}</Button>
      </Link>
    </div>
  );
}