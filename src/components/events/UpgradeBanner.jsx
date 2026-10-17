import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
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

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg">
      <Crown className="w-4 h-4 text-warning shrink-0" />
      <p className="text-sm text-foreground">
        {t("Free plan:")} {used} / {limit} {t("events used")} —{" "}
        <Link to="/plan" className="font-medium text-warning underline">{t("upgrade to Pro for unlimited")}</Link>.
      </p>
    </div>
  );
}