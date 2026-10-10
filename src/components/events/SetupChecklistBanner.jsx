import { Link } from "react-router-dom";
import { Rocket, X, Check, Circle, ChevronRight, Crown } from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useT } from "@/hooks/useT";

export default function SetupChecklistBanner() {
  const t = useT();
  const { ready, steps, doneCount, next, limitHit, complete, dismissed, dismiss } = useSetupProgress();

  if (!ready || dismissed || (complete && !limitHit)) return null;

  return (
    <div className="px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
      <div className="flex items-start gap-3">
        <Rocket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {next ? `${t("Finish setting up your workspace")} (${doneCount}/${steps.length})` : t("Your free plan limit is reached")}
          </p>
          {next && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("Next:")} {next.hint}{" "}
              <Link to={next.to} className="font-medium text-primary underline">{t("Do it now")}</Link>
              <span className="block mt-0.5">{t("Closing this? You can resume it from Preferences → Complete setup.")}</span>
            </p>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-2 rounded-full bg-primary/10 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              s.done ? "border-success/30 bg-success/10 text-success" : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {s.done ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3 text-muted-foreground" />}
            {s.label}
            {s.cap && <span className={s.atLimit ? "text-warning font-medium" : "text-muted-foreground"}>{s.cap}</span>}
            {!s.done && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </Link>
        ))}
      </div>

      {limitHit && (
        <p className="text-xs text-foreground flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-warning" />
          {t("Free plan limit reached.")}{" "}
          <Link to="/plan" className="font-medium text-warning underline">{t("Upgrade to Pro for more")}</Link>
        </p>
      )}
    </div>
  );
}
