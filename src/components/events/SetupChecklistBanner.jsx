import { useState } from "react";
import UpgradeButton from "@/components/common/UpgradeButton";
import { Link } from "react-router-dom";
import { Rocket, X, Check, ChevronRight, ChevronDown, Crown, Building2, Users, UserCog, Briefcase, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useQuickAdd } from "@/components/common/QuickAdd";

// One icon per setup step (steps without a quick-add dialog are the business profile).
const STEP_ICONS = { team: Users, role: UserCog, service: Briefcase, types: CalendarDays, profile: Building2 };

export default function SetupChecklistBanner() {
  const t = useT();
  const { ready, steps, doneCount, total, next, limitHit, complete, dismissed, dismiss } = useSetupProgress();
  const { open, dialogs } = useQuickAdd();
  const term = useBusinessTerminology();
  // Closed by default so the card stays small; one tap opens it.
  const [showHow, setShowHow] = useState(false);
  const item = term.workItemSingular.toLowerCase();
  const items = term.workItemPlural.toLowerCase();
  const article = /^[aeiou]/i.test(item) ? "an" : "a"; // "a project", "an event"
  const flow = [
    { title: t("Catch enquiries"), text: t("Add every enquiry in Leads and set a follow-up date, you get a reminder when it is due."), to: "/leads" },
    { title: t("Plan your {items}").replace("{items}", items), text: t("Turn a won lead into {article} {item}, then assign your team and services.").replace("{article}", article).replace("{item}", item), to: "/events" },
    { title: t("Quote and invoice"), text: t("Send a quotation for signing, then an invoice, from the same details."), to: "/quotation" },
    { title: t("Get paid"), text: t("Record payments against each {item} and see what is still pending in Financial.").replace("{item}", item), to: "/financial" },
  ];

  if (!ready || dismissed || (complete && !limitHit)) return null;

  return (
    <>
    <section id="setup-checklist" className="scroll-mt-20 bg-card border border-warning/60 rounded-[15px] p-3 sm:p-4 space-y-2.5" aria-label={t("Workspace setup")}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
          <Rocket className="w-4 h-4 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {next ? t("Finish setting up your workspace") : t("Your free plan limit is reached")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {next
              ? t("{done} of {total} done. A few quick steps and you're ready.").replace("{done}", doneCount).replace("{total}", total)
              : t("Upgrade to Pro to add more.")}
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="w-8 h-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1 rounded-full bg-warning/15 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
        <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>

      {/* Steps */}
      <ul className="grid gap-2 sm:grid-cols-2">
        {steps.map((s) => {
          const Icon = STEP_ICONS[s.quick || "profile"];
          const body = (
            <>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", s.done ? "bg-success/10" : "bg-primary/10")}>
                {s.done ? <Check className="w-4 h-4 text-success" /> : <Icon className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={cn("text-sm font-medium", s.done ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
                  {s.optional && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t("Optional")}</span>}
                  {s.cap && <span className={cn("text-xs", s.atLimit ? "text-warning font-medium" : "text-muted-foreground")}>{s.cap}</span>}
                </div>
                {/* Only the next step spells out its hint, so the card stays short. */}
                {s === next && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.hint}</p>}
              </div>
              {s.done ? (
                <span className="text-xs font-medium text-success shrink-0">{t("Done")}</span>
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </>
          );
          const rowCls = "flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40 w-full h-full text-left";
          return (
            <li key={s.label} className={s === next ? "sm:col-span-2" : undefined}>
              {s.done ? (
                <div className={rowCls}>{body}</div>
              ) : s.quick ? (
                // Steps with a quick-add dialog open it in place; the rest navigate.
                <button type="button" onClick={() => open(s.quick)} className={cn(rowCls, "hover:bg-muted transition-colors")}>{body}</button>
              ) : (
                <Link to={s.to} className={cn(rowCls, "hover:bg-muted transition-colors")}>{body}</Link>
              )}
            </li>
          );
        })}
      </ul>

      {limitHit && (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Crown className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="flex-1 min-w-0">{t("Free plan limit reached.")}</span>
          <UpgradeButton label={t("Upgrade to Pro")} />
        </div>
      )}

      {/* How it works */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setShowHow(!showHow)} aria-expanded={showHow} className="flex items-center gap-1 text-xs font-medium text-foreground">
            {t("How it works")}
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showHow && "rotate-180")} />
          </button>
          <p className="hidden sm:block text-[11px] text-muted-foreground text-right">{t("Closing this? You can resume it from Preferences → Complete setup.")}</p>
        </div>
        {showHow && (
          <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((f, i) => (
              <li key={f.title}>
                <Link to={f.to} className="flex gap-3 rounded-xl border border-border p-2.5 hover:bg-muted/40 transition-colors h-full">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{f.title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{f.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        {showHow && <p className="sm:hidden mt-2 text-[11px] text-muted-foreground">{t("Closing this? You can resume it from Preferences → Complete setup.")}</p>}
      </div>
    </section>
    {dialogs}
    </>
  );
}
