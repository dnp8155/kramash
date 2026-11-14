import { Crown } from "lucide-react";
import Button from "@/components/common/Button";
import { Link } from "react-router-dom";
import { AppDialogTitle, AppDialogDescription } from "@/components/ui/AppDialog";
import { useT } from "@/hooks/useT";
import { usePlan } from "@/hooks/usePlan";

// The plan name is shown as the same blue tag used next to Pro options in Preferences.
const PLAN_MARK = "\u0000";
function withPlanTag(text, plan) {
  return text.split(PLAN_MARK).flatMap((part, i) => (i === 0 ? [part] : [
    <span key={i} className="inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">{plan}</span>,
    part,
  ]));
}

// Content of the plan-limit / Pro-feature dialog (PlanLimitDialog). It sits inside the standard dialog, which is a
// bottom sheet on phones, so it uses the normal sheet background and spacing rather than a tinted box of its own.
export default function PlanLimitReached({
  resource = "resource",
  currentUsage = 0,
  limit = 0,
  requiredPlan = "Pro",
  featureLabel,
  onClose
}) {
  const t = useT();
  const { plan } = usePlan({ loadUsage: false });
  // Pro already is the top plan — don't send them to "upgrade"; point them to support to raise the cap.
  const proAtCap = plan?.planCode === "PRO" && !featureLabel;

  const title = proAtCap
    ? t("You've reached your plan's {resource} limit").replace("{resource}", resource)
    : featureLabel
    ? t("{feature} is a {plan} feature").replace("{feature}", featureLabel).replace("{plan}", requiredPlan)
    : t("You've reached the Free Plan {resource} limit").replace("{resource}", resource);

  const used = t("{used} / {limit} {resource} used.").replace("{used}", currentUsage).replace("{limit}", limit).split("{resource}").join(resource);
  const description = proAtCap
    ? `${used} ${t("Contact support if you need a higher limit.")}`
    : featureLabel
    ? t("Upgrade to Kramasha {plan} to access {feature}.").replace("{plan}", PLAN_MARK).replace("{feature}", featureLabel.toLowerCase())
    : `${used} ${t("Upgrade to Kramasha {plan} to create more {resource}.").replace("{plan}", PLAN_MARK).split("{resource}").join(resource)}`;

  return (
    <div className="flex flex-col items-center text-center px-6 pt-5 pb-6 sm:pt-8">
      <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mb-4">
        <Crown className="w-7 h-7 text-warning" />
      </div>
      <AppDialogTitle className="pr-0 text-lg">{title}</AppDialogTitle>
      <AppDialogDescription className="pr-0 mt-1.5 max-w-xs">{withPlanTag(description, requiredPlan)}</AppDialogDescription>
      <div className="mt-6 w-full flex flex-col gap-2">
        <Link to={proAtCap ? "/help" : "/plan"} onClick={onClose} className="w-full">
          <Button variant="primary" size="lg" className="w-full">{proAtCap ? t("Contact support") : t("View Pro Plans")}</Button>
        </Link>
        <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={onClose}>{t("Maybe later")}</Button>
      </div>
    </div>
  );
}
