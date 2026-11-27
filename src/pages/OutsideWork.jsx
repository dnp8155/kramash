import { useMemo, useState } from "react";
import { Calendar, MapPin, Briefcase, ClipboardList, ChevronDown, Loader2, EyeOff, Eye, ListChecks, Clock, TrendingUp, CheckCircle2, Wallet, Upload } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import Collapse from "@/components/common/Collapse";
import { PublicReceiptDialog } from "@/components/events/ShareInvoiceDialog";
import { methodLabel } from "@/constants/paymentRegions";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import AddToCalendar from "@/components/common/AddToCalendar";
import { useToast } from "@/components/ui/use-toast";
import { askConfirm } from "@/lib/confirmDialog";
import { formatDatesList, formatDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useReducedMotion } from "@/lib/motionVariants";
import { memberStatusMeta, todayLocal } from "@/lib/teamWork";
import { useOutsideWork, useMemberAppInvites, useRefreshOutsideWork, respondMemberAppLink, useOutsideOnEvents } from "@/lib/outsideWork";
import { Link } from "react-router-dom";

// "Work from others": bookings other businesses made for this person (as their team member), read-only, in their own
// app. Only what the Team Portal shows them: their own dates, role, venue, pay and shared job sheets.
export default function OutsideWork() {
  const t = useT();
  usePageTitle("Work from others");
  const { data: businesses = [], isLoading } = useOutsideWork();
  const { data: invites = [] } = useMemberAppInvites();
  const refresh = useRefreshOutsideWork();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState(null);
  // One business open at a time (like the packages in Preferences); the first one starts open.
  const [openKey, setOpenKey] = useState(undefined);
  const keyOf = (b) => b.member?.id || b.workspace?.id;
  const shownKey = openKey === undefined ? (businesses[0] ? keyOf(businesses[0]) : null) : openKey;

  const waiting = invites.filter((i) => i.status !== "accepted");

  const answer = async (memberId, accept, name) => {
    if (!accept && !(await askConfirm(t("Hide {name}'s bookings? You can show them again later.").replace("{name}", name), { title: t("Hide bookings?"), confirmLabel: t("Hide"), destructive: true }))) return;
    setBusyId(memberId);
    try {
      await respondMemberAppLink(memberId, accept);
      await refresh();
      toast({ title: accept ? t("Bookings added") : t("Bookings hidden"), description: accept ? t("Now on this page and your calendar. Your totals from all businesses are at the top.") : t("Hidden from your app.") });
    } catch (e) {
      toast({ title: t("Couldn't update"), description: e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    // Same frame as every other page: shared header, full width, cards side by side on wide screens.
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader eyebrow={t("People")} title={t("Work from others")} subtitle={t("Jobs other businesses booked you for. Also on your calendar in brown.")} />
      {businesses.length > 0 && <ShowOnEventsSwitch />}

      {waiting.map((i) => (
        <div key={i.member_id} className="bg-card border border-dashed border-outside/60 rounded-[15px] shadow-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <BusinessMark name={i.workspace_name} logo={i.workspace_logo} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{t("{name} added you to their team").replace("{name}", i.workspace_name)}</div>
            <div className="text-xs text-muted-foreground">{i.status === "declined" ? t("Hidden. Show any time.") : t("See the jobs they book you for.")}</div>
          </div>
          <Button size="sm" className="w-full sm:w-auto shrink-0" onClick={() => answer(i.member_id, true, i.workspace_name)} disabled={busyId === i.member_id}>
            {busyId === i.member_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} {t("Show")}
          </Button>
        </div>
      ))}

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="h-24 rounded-[15px] border border-border bg-card shadow-card skeleton-shimmer" />)}</div>
          {[0, 1].map((k) => <div key={k} className="h-16 rounded-[15px] border border-border bg-card shadow-card skeleton-shimmer" />)}
        </div>
      ) : businesses.length === 0 && waiting.length === 0 ? (
        <div className="bg-card border border-border rounded-[15px] shadow-card">
          <EmptyState title="No jobs from others yet" description="When a business on Kramasha books you, it shows here." />
        </div>
      ) : (
        <>
          {businesses.length > 0 && <AllTotals businesses={businesses} />}
          <div className="space-y-3">
            {businesses.map((b) => (
              <BusinessCard key={keyOf(b)} b={b} open={shownKey === keyOf(b)}
                onToggle={() => setOpenKey(shownKey === keyOf(b) ? null : keyOf(b))}
                busy={busyId === b.member?.id} onHide={() => answer(b.member?.id, false, b.workspace?.name || "")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BusinessMark({ name, logo }) {
  return logo
    ? <img src={logo} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
    : <div className="w-10 h-10 rounded-lg bg-outside/10 text-outside font-bold flex items-center justify-center shrink-0">{String(name || "?").charAt(0).toUpperCase()}</div>;
}

// Totals across every business that books you (same cards as the Team Portal's summary, in the app's style).
// Money is added up per currency; if businesses pay in different currencies, the others are listed underneath.
function AllTotals({ businesses }) {
  const t = useT();
  const today = todayLocal();
  const groups = businesses.flatMap((b) => b.groups || []);
  const upcoming = groups.filter((g) => (g.last_day || g.dates[g.dates.length - 1] || "") >= today).length;
  const byCur = {};
  for (const b of businesses) {
    const c = b.workspace?.currency || "INR";
    const s = b.summary || {};
    const x = (byCur[c] ||= { earned: 0, paid: 0, due: 0 });
    x.earned += Number(s.totalEarnings) || 0;
    x.paid += Number(s.totalPaid ?? Math.max(0, (s.totalEarnings || 0) - (s.remaining || 0))) || 0;
    x.due += Number(s.remaining) || 0;
  }
  const currencies = Object.keys(byCur).sort((a, b) => byCur[b].earned - byCur[a].earned);
  const main = currencies[0] || "INR";
  const m = byCur[main] || { earned: 0, paid: 0, due: 0 };
  // Paid in more than one currency: the same cards; the main currency big, the others as one small line underneath
  // (never added together; a zero amount is left out).
  const others = (key) => {
    const parts = currencies.slice(1).filter((c) => byCur[c][key] > 0).map((c) => formatMoney(byCur[c][key], c));
    return parts.length ? `+ ${parts.join(" · ")}` : undefined;
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">{t("Totals from every business that books you. Tap a business below for its jobs, payments and receipts.")}</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label={t("Bookings")} value={groups.length} icon={Calendar} tone="primary" />
        <StatCard label={t("Upcoming")} value={upcoming} icon={Clock} tone="warning" />
        <StatCard label={t("Earned")} value={formatMoney(m.earned, main)} icon={TrendingUp} tone="primary" sub={others("earned")} />
        <StatCard label={t("Paid")} value={formatMoney(m.paid, main)} icon={CheckCircle2} tone="success" sub={others("paid")} />
        <StatCard label={t("Due")} value={formatMoney(m.due, main)} icon={Wallet} tone={m.due > 0 ? "warning" : "success"} sub={others("due")} className="col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}

// One business: a row with the chevron on the right (like the quotation sections). Open, it is that business's Team
// Portal inside the app: totals, upcoming, payments with receipts, done. (No contact card: they already work together.)
function BusinessCard({ b, open, onToggle, busy, onHide }) {
  const t = useT();
  const reduce = useReducedMotion();
  const [showDone, setShowDone] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);
  const currency = b.workspace?.currency || "INR";
  const money = (n) => formatMoney(n, currency);
  const today = todayLocal();
  const jobSheets = useMemo(() => Object.fromEntries((b.projects || []).filter((p) => p.job_sheet_token).map((p) => [p.id, p.job_sheet_token])), [b.projects]);
  // Paid / due per job, from the same projects list the Team Portal shows (filled once payments carry their job).
  const paidByJob = useMemo(() => Object.fromEntries((b.projects || []).filter((p) => p.paid != null).map((p) => [p.id, { paid: p.paid, due: p.due, total: p.total_earnings }])), [b.projects]);
  const upcoming = (b.groups || []).filter((g) => (g.last_day || g.dates[g.dates.length - 1] || "") >= today);
  const done = (b.groups || []).filter((g) => (g.last_day || g.dates[g.dates.length - 1] || "") < today).reverse();
  const payments = b.payments || [];
  const s = b.summary || {};
  const paid = s.totalPaid ?? Math.max(0, (s.totalEarnings || 0) - (s.remaining || 0));

  return (
    <section className="bg-card border border-border rounded-[15px] shadow-card min-w-0">
      <div className="flex items-center gap-3 px-3 sm:px-4 py-3">
        <button type="button" onClick={onToggle} aria-expanded={open} className="no-press min-w-0 flex-1 flex items-center gap-3 text-left">
          <BusinessMark name={b.workspace?.name} logo={b.workspace?.logo} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground truncate">{b.workspace?.name}</span>
            <span className="block text-xs text-muted-foreground truncate">
              {t("As {name}").replace("{name}", b.member?.name || "")}<span className="hidden sm:inline"> · {upcoming.length} {t("upcoming")}</span>
            </span>
          </span>
        </button>
        <Button variant="ghost" size="sm" onClick={onHide} disabled={busy} aria-label={t("Hide")} className="text-muted-foreground shrink-0 max-sm:px-2">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />} <span className="hidden sm:inline">{t("Hide")}</span>
        </Button>
        {/* Same chevron as the quotation sections: on the right, flips up when open. */}
        <button type="button" onClick={onToggle} aria-label={b.workspace?.name || t("Business")} aria-expanded={open} className="shrink-0 p-1 -m-1">
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <Collapse open={open}>
        <div className="px-3 sm:px-5 pb-4 pt-4 border-t border-border space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              [t("Earned"), s.totalEarnings, "text-foreground"],
              [t("Paid"), paid, "text-success"],
              [t("Due"), s.remaining, s.remaining > 0 ? "text-warning" : "text-muted-foreground"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl bg-muted/40 px-2.5 sm:px-3 py-2 min-w-0">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className={cn("text-sm sm:text-base font-semibold tabular-nums truncate", tone)} title={money(value || 0)}>{money(value || 0)}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="min-w-0">
              <SubHead icon={Calendar} label={t("Upcoming")} count={upcoming.length} />
              {upcoming.length === 0
                ? <p className="text-sm text-muted-foreground py-2">{t("No upcoming bookings.")}</p>
                : <div className="divide-y divide-border">{upcoming.map((g) => <BookingRow key={g.id} g={g} money={money} business={b.workspace?.name} jobSheet={jobSheets[g.id]} memberId={b.member?.id} pay={paidByJob[g.id]} withCalendar />)}</div>}

              {done.length > 0 && (
                <div className="mt-3">
                  <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    {t("Done")} ({done.length}) <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDone && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {showDone && (
                      <motion.div key="done" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
                        <div className="divide-y divide-border">{done.map((g) => <BookingRow key={g.id} g={g} money={money} business={b.workspace?.name} pay={paidByJob[g.id]} />)}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Payments, each with the same receipt the Team Portal gives */}
            <div className="min-w-0">
              <SubHead icon={Wallet} label={t("Payments")} count={payments.length} />
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t("No payments yet.")}</p>
              ) : (
                <div className="divide-y divide-border">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground tabular-nums">{money(p.amount)}</div>
                        {p.event_title && <div className="text-xs text-foreground/80 mt-0.5 line-clamp-2 break-words">{t("for")} {p.event_title}</div>}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="whitespace-nowrap">{formatDate(p.transaction_date)}</span> · {methodLabel(p.payment_method, currency)}
                          {p.reference_number && ` · ${t("Ref")}: ${p.reference_number}`}
                        </div>
                      </div>
                      <button type="button" onClick={() => setReceiptTx(p)} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                        <Upload className="w-3.5 h-3.5" /> {t("Receipt")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </Collapse>

      {/* Same receipt picture the business shares for a team payment (and the Team Portal shows). */}
      <PublicReceiptDialog
        open={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx ? { ...receiptTx, transaction_type: "TEAM_PAYMENT" } : null}
        event={receiptTx?.event_title ? { title: receiptTx.event_title } : null}
        workspace={b.workspace}
        currency={currency}
        particularFor={() => `Payment to ${b.member?.name || "Team member"}${b.member?.profession ? ` (${b.member.profession})` : ""}`}
        typeLabel={() => "Paid"}
      />
    </section>
  );
}

function SubHead({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
      <Icon className="w-3.5 h-3.5" /> {label} ({count})
    </div>
  );
}

function BookingRow({ g, money, business, jobSheet, memberId, pay, withCalendar }) {
  const t = useT();
  const meta = memberStatusMeta(g, g.event_status);
  // Theme colours (the Team Portal's pastel pills are made for its light page only).
  const pill = { Completed: "bg-success/10 text-success", Today: "bg-warning/10 text-warning", "In Progress": "bg-warning/10 text-warning", Postponed: "bg-muted text-muted-foreground", Cancelled: "bg-destructive/10 text-destructive" }[meta.label] || "bg-primary/10 text-primary";
  const roles = g.lines.map((l) => l.role_name).filter(Boolean);
  return (
    <div className="py-2.5 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground break-words">{g.event_title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-start gap-1"><Calendar className="w-3 h-3 shrink-0 mt-0.5" /> {formatDatesList(g.dates)}</span>
          {g.venue && <span className="flex items-start gap-1 min-w-0 break-words"><MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {g.venue}</span>}
          {roles.length > 0 && <span className="flex items-start gap-1"><Briefcase className="w-3 h-3 shrink-0 mt-0.5" /> {roles.join(", ")}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {withCalendar && (
            <AddToCalendar event={{ title: g.event_title, dates: g.dates, venue: g.venue, description: [roles.length && `${t("Your role")}: ${roles.join(", ")}`, business && `${t("For")} ${business}`].filter(Boolean).join(" · "), uid: `outside-${g.id}` }} />
          )}
          {jobSheet && (
            // Opens in the app (same window) with a back arrow to this page — an installed app has no browser back.
            <Link to={`/job-sheet/${jobSheet}?${memberId ? `for=${memberId}&` : ""}back=/outside-work`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <ClipboardList className="w-3 h-3" /> {t("Job Sheet")}
            </Link>
          )}
        </div>
      </div>
      {/* The card header already names the business, so no repeated "For …" chip here. */}
      <div className="text-right shrink-0 space-y-1">
        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap", pill)}>{t(meta.label)}</span>
        {g.total > 0 && <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{money(g.total)}</div>}
        {/* Paid / due for this job (as on the Team Portal) */}
        {pay && pay.total > 0 && (pay.due <= 0
          ? <div className="text-xs font-medium text-success whitespace-nowrap">✓ {t("Fully paid")}</div>
          : <div className="text-xs font-medium whitespace-nowrap">{pay.paid > 0 && <span className="text-success">{t("Paid")} {money(pay.paid)} · </span>}<span className="text-warning">{t("Due")} {money(pay.due)}</span></div>)}
      </div>
    </div>
  );
}

// "Show on Events page": your next 3 jobs from others, in brown, on your Events page. Your own choice, saved to your
// account (same on every device). On by default.
function ShowOnEventsSwitch() {
  const t = useT();
  const { toast } = useToast();
  const { on, setOn } = useOutsideOnEvents();
  const change = async (next) => {
    try {
      await setOn(next);
      toast({ title: next ? t("Showing on your Events page.") : t("Hidden from your Events page.") });
    } catch {
      toast({ title: t("Couldn't save. Try again."), variant: "destructive" });
    }
  };
  return (
    <label className="bg-card border border-border rounded-[15px] shadow-card p-4 flex items-center gap-3 cursor-pointer">
      <span className="w-9 h-9 rounded-lg bg-outside/10 text-outside flex items-center justify-center shrink-0"><ListChecks className="w-[18px] h-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{t("Show on Events page")}</span>
        <span className="block text-xs text-muted-foreground">{t("Your next 3 jobs from others, in brown.")}</span>
      </span>
      <Switch checked={on} onCheckedChange={change} aria-label={t("Show on Events page")} />
    </label>
  );
}
