import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import Button from "@/components/common/Button";

// "Free plan: 3 / 5 events used" card with a small usage bar and an Upgrade button. Same card look as the
// setup card (round icon, rounded corners) in a warm orange tint. Turns red once the limit is reached.
export default function PlanUsageBanner({ title, used = 0, limit = 0 }) {
  const t = useT();
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const full = limit > 0 && used >= limit;
  return (
    <div className={cn("flex items-center gap-3 border rounded-[15px] px-3 py-2.5", full ? "bg-destructive/10 border-destructive/50" : "bg-warning/10 border-warning/50")}>
      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
        <Crown className="w-4 h-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 max-w-[160px] rounded-full bg-warning/20 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
            <div className={cn("h-full rounded-full transition-all", full ? "bg-destructive" : "bg-warning")} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground truncate">{full ? t("Limit reached") : t("Unlimited on Pro")}</span>
        </div>
      </div>
      <Link to="/plan" className="shrink-0">
        <Button variant="outline" size="sm">{t("Upgrade")}</Button>
      </Link>
    </div>
  );
}
