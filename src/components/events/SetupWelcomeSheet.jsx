import { useEffect, useState } from "react";
import { Rocket, CalendarRange, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { AppDialog, AppDialogContent, AppDialogTitle, AppDialogDescription } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

// Set by the onboarding screen when a brand-new workspace is opened for the first time. The welcome shows once,
// on that first visit, and never again (so existing users are not greeted after an update).
export const WELCOME_PENDING_KEY = "kramasha:setup-welcome-pending";

const FY_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function markSetupWelcomePending() {
  try { localStorage.setItem(WELCOME_PENDING_KEY, "1"); } catch { /* optional */ }
}

// A bottom sheet on phones, a small dialog on larger screens: greets a new workspace and points at the setup card.
export default function SetupWelcomeSheet() {
  const t = useT();
  const { ready, steps, total, complete, dismissed } = useSetupProgress();
  const [open, setOpen] = useState(false);
  const { workspace } = useWorkspace() || {};
  const fyMonth = Number(workspace?.fy_start_month) || 4;
  const term = useBusinessTerminology();

  useEffect(() => {
    if (!ready) return;
    let pending = false;
    try { pending = localStorage.getItem(WELCOME_PENDING_KEY) === "1"; } catch { /* optional */ }
    if (!pending) return;
    try { localStorage.removeItem(WELCOME_PENDING_KEY); } catch { /* optional */ }
    if (complete || dismissed) return;
    // Never open on top of another sheet (e.g. the install-app prompt on a slow connection): wait until it's closed.
    let tries = 0;
    let timer;
    const tryOpen = () => {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]') && tries++ < 60) { timer = setTimeout(tryOpen, 1000); return; }
      setOpen(true);
    };
    tryOpen();
    return () => clearTimeout(timer);
  }, [ready, complete, dismissed]);

  const start = () => {
    setOpen(false);
    // Let the sheet finish closing, then bring the setup card into view.
    setTimeout(() => document.getElementById("setup-checklist")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  };

  const required = steps.filter((s) => !s.optional);
  const left = required.filter((s) => !s.done).length;

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogContent maxWidth="max-w-sm" className="p-0">
        {/* Scrolls on short screens (small iPhones, large text) so the buttons are never cut off. */}
        <div className="flex flex-col items-center text-center px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pt-8 sm:pb-6 max-h-[92dvh] overflow-y-auto overscroll-contain">
          <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mb-4">
            <Rocket className="w-7 h-7 text-warning" />
          </div>
          <AppDialogTitle className="pr-0 text-lg">{t("Welcome to Kramasha!")}</AppDialogTitle>
          <AppDialogDescription className="pr-0 mt-1.5 max-w-xs">
            {left === 1
              ? t("Just 1 step left and your workspace is ready.")
              : t("{left} of {total} steps left and your workspace is ready. It takes about a minute.").replace("{left}", left).replace("{total}", total)}
          </AppDialogDescription>
          <ol className="mt-4 w-full space-y-2 text-left">
            {required.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                {/* Steps sign-up already did show a tick. */}
                {s.done
                  ? <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-3.5 w-3.5" /></span>
                  : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-xs font-semibold text-warning">{i + 1}</span>}
                <span className={s.done ? "text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40" : "text-sm font-medium text-foreground"}>{s.label}</span>
              </li>
            ))}
          </ol>
          {/* The FY start month locks once the first event or payment exists, so say it now, before anything is added. */}
          <div className="mt-3 w-full flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5 text-left">
            <CalendarRange className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("Your financial year runs {from} to {to}.").replace("{from}", t(FY_MONTHS[fyMonth - 1])).replace("{to}", t(FY_MONTHS[(fyMonth + 10) % 12]))}{" "}
              {t("Need a different start month? Change it before adding your first {item} or payment.").replace("{item}", term.workItemSingular.toLowerCase())}{" "}
              <Link to="/preferences?group=general&section=profile" onClick={() => setOpen(false)} className="text-primary font-medium hover:underline">{t("Change")}</Link>
            </p>
          </div>
          <div className="mt-6 w-full flex flex-col gap-2">
            <Button variant="primary" size="lg" className="w-full" onClick={start}>{t("Start setup")}</Button>
            <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>{t("Maybe later")}</Button>
          </div>
        </div>
      </AppDialogContent>
    </AppDialog>
  );
}
