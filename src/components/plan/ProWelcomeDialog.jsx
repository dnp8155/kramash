import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, CalendarCheck, CalendarClock, Layers, Gift, CreditCard, ShieldCheck, RefreshCw, Check } from "lucide-react";
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
  AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { usePlan } from "@/hooks/usePlan";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";

const SEEN_KEY = "kramasha_pro_welcome_seen";
// Only a subscription created this recently is celebrated, so existing Pro users aren't greeted on the first load after this ships.
const FRESH_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const PERKS = ["Unlimited events & team", "Client & team portals", "Link sharing", "Push reminders", "Advanced themes", "Excel / CSV export"];

// How the Pro plan arrived: a payment, an admin assigning it, the free launch month, or an extension of an existing plan.
export function proWelcomeVariant(subscription, renewed) {
  if (renewed) return "renewed";
  if (subscription?.source === "PROMOTIONAL") return "launch";
  if (subscription?.source === "PAYMENT_GATEWAY") return "paid";
  return "admin";
}

const VARIANTS = {
  paid: { icon: CreditCard, title: "You're now a Pro!", sub: "Payment received. Every Pro feature is unlocked." },
  admin: { icon: ShieldCheck, title: "You're now a Pro!", sub: "Kramasha has activated Pro on your workspace." },
  launch: { icon: Gift, title: "Welcome to Pro — it's on us!", sub: "Your free launch month of Pro is active." },
  renewed: { icon: RefreshCw, title: "Pro renewed!", sub: "Thanks for staying with us. Your plan has been extended." },
};

// The sheet itself, separate from the "should it show" logic so it can be previewed with any data.
export function ProWelcomeSheet({ open, onOpenChange, variant, cycle, startedAt, expiresAt, onViewPlan }) {
  const t = useT();
  const v = VARIANTS[variant] || VARIANTS.admin;
  const Icon = v.icon;
  const days = expiresAt ? Math.max(0, Math.ceil((new Date(String(expiresAt).slice(0, 10) + "T23:59:59") - new Date()) / 86400000)) : null;
  const rows = [
    { icon: Layers, label: t("Plan"), value: `Pro${cycle ? ` · ${BILLING_LABELS[cycle] || cycle}` : ""}` },
    startedAt && { icon: CalendarCheck, label: t("Started"), value: formatDate(String(startedAt).slice(0, 10)) },
    expiresAt && { icon: CalendarClock, label: t("Valid until"), value: `${formatDate(String(expiresAt).slice(0, 10))}${days != null ? ` · ${days} ${days === 1 ? "day" : "days"} left` : ""}` },
  ].filter(Boolean);

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader className="items-center text-center border-b-0 pb-0">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
            <Icon className="h-8 w-8" />
          </div>
          <AppDialogTitle className="pr-0 text-xl">{t(v.title)}</AppDialogTitle>
          <AppDialogDescription className="pr-0">{t(v.sub)}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {rows.map(({ icon: RowIcon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <RowIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="ml-auto text-sm font-medium text-foreground text-right">{value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Crown className="h-3.5 w-3.5 text-primary" />{t("Now unlocked")}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {PERKS.map((p) => (
                <div key={p} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0" />{t(p)}
                </div>
              ))}
            </div>
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("Let's go")}</Button>
          {onViewPlan && <Button variant="outline" onClick={onViewPlan}>{t("View my plan")}</Button>}
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}

async function burstConfetti() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const base = { zIndex: 200, disableForReducedMotion: true, colors: ["#FFB400", "#FF5A5F", "#22C55E", "#3B82F6", "#A855F7"] };
  confetti({ ...base, particleCount: 110, spread: 80, startVelocity: 48, origin: { x: 0.5, y: 0.7 } });
  setTimeout(() => confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } }), 250);
  setTimeout(() => confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } }), 250);
}

// Shows once per new Pro subscription — whether the owner paid, an admin assigned it, or it's the launch month.
export default function ProWelcomeDialog() {
  const navigate = useNavigate();
  const { workspaceId, role } = useWorkspace();
  const { plan } = usePlan({ loadUsage: false });
  const [open, setOpen] = useState(false);

  const sub = plan?.subscription;
  const isPro = plan?.planCode === "PRO" && !plan?.isExpired && plan?.planStatus === "active" && sub?.status === "ACTIVE" && role === "owner";

  useEffect(() => {
    if (!isPro || !workspaceId) return;
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { /* storage unavailable */ }
    if (seen[sub.id]) return;
    const remember = () => {
      try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, [sub.id]: 1 })); } catch { /* storage unavailable */ }
    };
    remember();
    const created = new Date(sub.created_date || sub.created_at || 0).getTime();
    if (!created || Date.now() - created > FRESH_WITHIN_MS) return;
    setOpen(true);
    burstConfetti();
  }, [isPro, workspaceId, sub?.id, sub?.created_date, sub?.created_at]);

  if (!isPro) return null;
  return (
    <ProWelcomeSheet
      open={open}
      onOpenChange={setOpen}
      variant={proWelcomeVariant(sub, plan.hadEarlierSubscription)}
      cycle={sub.billing_cycle_snapshot}
      startedAt={sub.started_at}
      expiresAt={plan.expiresAt}
      onViewPlan={() => { setOpen(false); navigate("/plan"); }}
    />
  );
}
