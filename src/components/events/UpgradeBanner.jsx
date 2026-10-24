import PlanUsageBanner from "@/components/common/PlanUsageBanner";
import { usePlan } from "@/hooks/usePlan";
import { useT } from "@/hooks/useT";
import { PLAN_UNLIMITED } from "@/lib/planService";

export default function UpgradeBanner({ used = 0 }) {
  const t = useT();
  // The resolved plan (subscription, expiry, exempt admins) — not the workspace's plan_type column,
  // which isn't updated for every kind of Pro access. Wait for it so Pro users never see a flash.
  const { plan, loading } = usePlan({ loadUsage: false });
  if (loading || !plan) return null;
  if (plan.planCode === "PRO") return null;

  const limit = plan.limits?.max_events;
  if (!Number.isFinite(limit) || limit >= PLAN_UNLIMITED) return null;

  return <PlanUsageBanner title={`${t("Free plan:")} ${used} / ${limit} ${t("events used")}`} used={used} limit={limit} />;
}