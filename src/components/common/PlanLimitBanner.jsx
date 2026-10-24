import { usePlan } from "@/hooks/usePlan";
import { useT } from "@/hooks/useT";
import PlanUsageBanner from "@/components/common/PlanUsageBanner";
import { PLAN_UNLIMITED } from "@/lib/planService";

// "Free plan: 12 / 50 leads used" for any limited resource (leads, services, ...). Hidden on Pro, for unlimited
// plans, and while the plan or the counts are still loading, so nothing flashes.
// limitKey: plan limit key (e.g. "max_leads"); usageKey: key in the usage counts (e.g. "leads"); noun: plural label.
export default function PlanLimitBanner({ limitKey, usageKey, noun }) {
  const t = useT();
  const { plan, usage, loading } = usePlan();
  if (loading || !plan || !usage || plan.planCode === "PRO") return null;
  const limit = plan.limits?.[limitKey];
  if (!Number.isFinite(limit) || limit >= PLAN_UNLIMITED) return null;
  return <PlanUsageBanner title={`${t("Free plan:")} ${usage[usageKey] ?? 0} / ${limit} ${t(noun)}`} used={usage[usageKey] ?? 0} limit={limit} />;
}
