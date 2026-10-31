import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogTitle, AppDialogDescription } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useT } from "@/hooks/useT";

// Set by the onboarding screen when a brand-new workspace is opened for the first time. The welcome shows once,
// on that first visit, and never again (so existing users are not greeted after an update).
export const WELCOME_PENDING_KEY = "kramasha:setup-welcome-pending";

export function markSetupWelcomePending() {
  try { localStorage.setItem(WELCOME_PENDING_KEY, "1"); } catch { /* optional */ }
}

// A bottom sheet on phones, a small dialog on larger screens: greets a new workspace and points at the setup card.
export default function SetupWelcomeSheet() {
  const t = useT();
  const { ready, steps, total, complete, dismissed } = useSetupProgress();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let pending = false;
    try { pending = localStorage.getItem(WELCOME_PENDING_KEY) === "1"; } catch { /* optional */ }
    if (!pending) return;
    try { localStorage.removeItem(WELCOME_PENDING_KEY); } catch { /* optional */ }
    if (!complete && !dismissed) setOpen(true);
  }, [ready, complete, dismissed]);

  const start = () => {
    setOpen(false);
    // Let the sheet finish closing, then bring the setup card into view.
    setTimeout(() => document.getElementById("setup-checklist")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  };

  const required = steps.filter((s) => !s.optional);

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogContent maxWidth="max-w-sm" className="p-0">
        <div className="flex flex-col items-center text-center px-6 pt-5 pb-6 sm:pt-8">
          <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mb-4">
            <Rocket className="w-7 h-7 text-warning" />
          </div>
          <AppDialogTitle className="pr-0 text-lg">{t("Welcome to Kramasha!")}</AppDialogTitle>
          <AppDialogDescription className="pr-0 mt-1.5 max-w-xs">
            {t("{total} quick steps and your workspace is ready. It takes about a minute.").replace("{total}", total)}
          </AppDialogDescription>
          <ol className="mt-4 w-full space-y-2 text-left">
            {required.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-xs font-semibold text-warning">{i + 1}</span>
                <span className="text-sm font-medium text-foreground">{s.label}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 w-full flex flex-col gap-2">
            <Button variant="primary" size="lg" className="w-full" onClick={start}>{t("Start setup")}</Button>
            <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>{t("Maybe later")}</Button>
          </div>
        </div>
      </AppDialogContent>
    </AppDialog>
  );
}
