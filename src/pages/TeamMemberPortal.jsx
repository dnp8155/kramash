import PublicFooter from "@/components/common/PublicFooter";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import { useState, useEffect } from "react";
import PortalUpdateButton from "@/components/portal/PortalUpdateButton";
import { usePortalUpdates } from "@/hooks/usePortalUpdates";
import { toast as showToast } from "@/components/ui/use-toast";
import PortalProviderCard from "@/components/portal/PortalProviderCard";
import { portalLoginPath } from "@/lib/portalLoginPath";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { getTeamPortalSession, clearTeamPortalSession } from "@/lib/teamPortalSession";
import { loadTeamPortalData } from "@/lib/teamPortalAccess";
import { Image } from "@/components/ui/image";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import {
  Calendar, Wallet, LogOut, MapPin, CheckCircle2, Briefcase, Clock, TrendingUp, ClipboardList, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/motionVariants";
import { formatMoney, setNumberFormat } from "@/utils/format";
import { formatDate as formatDateShared, formatDatesList, setDateFormat } from "@/lib/dates";
import AddToCalendar from "@/components/common/AddToCalendar";
import { PublicReceiptDialog } from "@/components/events/ShareInvoiceDialog";
import { methodLabel } from "@/constants/paymentRegions";
import { EVENT_STATUS_META, todayLocal, memberStatusMeta, groupByEvent } from "@/lib/teamWork";
import { runEarly, teamPortalKey } from "@/lib/earlyData";

function money(n, currency) {
  return formatMoney(n, currency);
}

function formatDate(d) {
  if (!d) return "—";
  return formatDateShared(d);
}

// The actual selected dates — never a "start – end" range. Falls back to
// just the start date when neither a dates list nor an end date is known.

function formatSelectedDates(item) {
  const dates = item.working_dates?.length ? item.working_dates : item.dates?.length ? item.dates : [item.start_date].filter(Boolean);
  return formatDatesList(dates);
}

function ScheduleCard({ group, currency, businessName, withCalendar }) {
  const meta = memberStatusMeta(group, group.event_status);
  const roles = group.lines.map((l) => l.role_name).filter(Boolean);
  // More than one role with a price: tapping the total (faint dotted underline) opens what each one pays. Closed by default, so the card stays simple.
  const priced = group.lines.filter((l) => l.agreed_rate > 0);
  const canSplit = group.lines.length > 1 && priced.length > 0;
  const [split, setSplit] = useState(false);
  const reduce = useReducedMotion();
  return (
    // The per-role split opens under the whole row (full width), so the columns above keep their width and the text never rewraps.
    <div className="py-3">
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{group.event_title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-start gap-1"><Calendar className="w-3 h-3 shrink-0 mt-0.5" /> {formatDatesList(group.dates)}</span>
          {group.venue && <span className="flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {group.venue}</span>}
          {roles.length > 0 && <span className="flex items-start gap-1"><Briefcase className="w-3 h-3 shrink-0 mt-0.5" /> {roles.join(", ")}</span>}
        </div>
        {withCalendar && (
          <AddToCalendar
            className="mt-2"
            event={{ title: group.event_title, dates: group.dates, venue: group.venue, description: [roles.length && `Your role: ${roles.join(", ")}`, businessName && `For ${businessName}`].filter(Boolean).join(" · "), uid: group.id }}
          />
        )}
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
        {group.total > 0 && (canSplit ? (
          // Own row under the tag (a bare inline button would sit beside it).
          <div className="mt-1">
          <button
            type="button"
            onClick={() => setSplit((v) => !v)}
            aria-expanded={split}
            aria-label={split ? "Hide amount per role" : "Show amount per role"}
            // Looks like every other card's amount; only a faint dotted underline hints that it opens.
            className="text-xs text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-[3px] hover:text-foreground transition-colors"
          >
            {money(group.total, currency)}
          </button>
          </div>
        ) : <div className="text-xs text-muted-foreground mt-1">{money(group.total, currency)}</div>)}
      </div>
    </div>
      <AnimatePresence initial={false}>
        {canSplit && split && (
          <motion.div
            key="split"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-0.5 text-right text-[11px] text-muted-foreground">
              {group.lines.map((l) => (
                <div key={l.key}>{l.role_name || "—"} · {money(l.agreed_rate, currency)}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TeamMemberPortal() {
  const { logout, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptTx, setReceiptTx] = useState(null);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  // Same pattern as the Client Portal: "<business> - Team Portal".
  useEffect(() => {
    document.title = data?.workspace?.name ? `${data.workspace.name} - Team Portal` : "Team Portal";
  }, [data?.workspace?.name]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const portalSession = getTeamPortalSession();
        if (!portalSession) {
          setError("Your portal session is no longer active. Please sign in again.");
          return;
        }
        const d = await runEarly(teamPortalKey(portalSession), () => loadTeamPortalData(portalSession.token, portalSession.team_member_id));
        setData(d);
        setDateFormat(d?.workspace?.date_format);
        setNumberFormat(d?.workspace?.number_format);
        if (d?.auto_linked) {
          toast({ title: "Welcome to your portal!", description: "Your account has been linked successfully." });
          checkUserAuth();
        }
      } catch (e) {
        setError(e?.message || e?.data?.error || "Failed to load your portal data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    clearTeamPortalSession();
    if (logout) logout(false);
    window.location.href = portalLoginPath("team");
  };

  // Quiet check for changes by the business (schedule, payments): shows the floating "New update" button.
  const updates = usePortalUpdates({
    enabled: !!data && !error,
    current: data,
    fetchLatest: async () => {
      const s = getTeamPortalSession();
      return s ? loadTeamPortalData(s.token, s.team_member_id) : null;
    },
    onApply: (d) => setData(d),
  });
  const refreshNow = async () => { if (await updates.apply()) showToast({ title: "Updated just now" }); };

  if (loading) {
    return <PortalPageSkeleton maxWidth="max-w-5xl" statCards={4} />;
  }

  if (error) {
    return (
      <UnavailableScreen
        title="This portal is no longer available"
        message="Your access may have been disabled, or your session has expired. Please sign in again, or contact your service provider if you think this is a mistake."
      >
        <button onClick={handleLogout} className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors">
          Back to Sign In
        </button>
      </UnavailableScreen>
    );
  }

  if (!data) return null;

  const { member, workspace, summary, upcoming, past, projects, payments } = data;
  const currency = workspace?.currency || "INR";
  // One card per event, split by the event's LAST booked day, so an event with one booking done and one still to come
  // shows once (under Upcoming), and every count below counts events the same way.
  const today = todayLocal();
  const allGroups = groupByEvent([...(upcoming || []), ...(past || [])]);
  const upcomingGroups = allGroups.filter((g) => (g.last_day || g.dates[g.dates.length - 1] || "") >= today);
  const pastGroups = allGroups.filter((g) => (g.last_day || g.dates[g.dates.length - 1] || "") < today).reverse();

  return (
    <div className="min-h-screen bg-background">
      <PortalUpdateButton show={updates.hasUpdate} busy={updates.busy} onClick={refreshNow} />
      <header className="bg-card border-b border-border sticky top-0 z-10 safe-area-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {workspace?.logo ? (
              <Image src={workspace.logo} alt={workspace.name} fittingType="fit" className="w-9 h-9 rounded-lg border border-border object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm font-bold">{(workspace?.name || "K").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{workspace?.name || "Team Portal"}</div>
              <div className="text-xs text-muted-foreground truncate">Welcome, {member?.name || "Team Member"}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors shrink-0">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 [&>:last-child]:col-span-2 lg:[&>:last-child]:col-span-1">
          <SummaryCard icon={Calendar} label="Total Bookings" value={allGroups.length} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard icon={Clock} label="Upcoming" value={upcomingGroups.length} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard icon={TrendingUp} label="Total Earnings" value={money(summary.totalEarnings, currency)} color="text-emerald-600" bg="bg-emerald-50" />
          <SummaryCard icon={CheckCircle2} label="Total Paid" value={money(summary.totalPaid ?? Math.max(0, (summary.totalEarnings || 0) - (summary.remaining || 0)), currency)} color="text-green-600" bg="bg-green-50" />
          <SummaryCard icon={Wallet} label="Remaining" value={money(summary.remaining, currency)} color="text-red-600" bg="bg-red-50" />
        </div>

        <Section title="Upcoming Schedule" icon={Calendar} count={upcomingGroups.length}>
          {upcomingGroups.length === 0 ? (
            <EmptyMessage message="No upcoming assignments." />
          ) : (
            <div className="divide-y divide-border">
              {upcomingGroups.map((g) => <ScheduleCard key={g.id} group={g} currency={currency} businessName={workspace?.name} withCalendar />)}
            </div>
          )}
        </Section>

        <Section title="Your Projects" icon={Briefcase} count={projects?.length || 0}>
          {(!projects || projects.length === 0) ? (
            <EmptyMessage message="No projects assigned yet." />
          ) : (
            <div className="divide-y divide-border">
              {projects.map((p) => {
                const meta = memberStatusMeta(p, p.status);
                const isDone = meta === EVENT_STATUS_META.completed;
                return (
                  <div key={p.id} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-start gap-1"><Calendar className="w-3 h-3 shrink-0 mt-0.5" /> {formatSelectedDates(p)}</span>
                        {p.venue && <span className="flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {p.venue}</span>}
                        {p.roles?.length > 0 && <span className="flex items-start gap-1"><Briefcase className="w-3 h-3 shrink-0 mt-0.5" /> {p.roles.join(", ")}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {p.total_earnings > 0 && <div className="text-xs text-muted-foreground">{money(p.total_earnings, currency)}</div>}
                      {/* Paid / due for this project (shown once the server sends each payment's project). */}
                      {p.paid != null && p.total_earnings > 0 && (
                        p.due <= 0
                          ? <div className="text-xs font-medium text-emerald-600">✓ Fully paid</div>
                          : <div className="text-xs font-medium"><span className="text-emerald-600">{p.paid > 0 ? `Paid ${money(p.paid, currency)} · ` : ""}</span><span className="text-red-600">{money(p.due, currency)} due</span></div>
                      )}
                      {p.job_sheet_token && !isDone && (
                        <a href={`/job-sheet/${p.job_sheet_token}?${member?.id ? `for=${member.id}&` : ""}back=/team-portal`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                          <ClipboardList className="w-3 h-3" /> Job Sheet
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Payment History" icon={Wallet} count={payments?.length || 0}>
          {(!payments || payments.length === 0) ? (
            <EmptyMessage message="No payments recorded yet." />
          ) : (
            <div className="divide-y divide-border">
              {payments.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {/* Amount, then what it was for, then when and how: one fact per line, so nothing reflows. */}
                    <div className="text-sm font-semibold text-foreground tabular-nums">{money(t.amount, currency)}</div>
                    {t.event_title && <div className="text-xs text-foreground/80 mt-0.5 line-clamp-2 break-words">for {t.event_title}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="whitespace-nowrap">{formatDate(t.transaction_date)}</span> · {methodLabel(t.payment_method, currency)}
                      {t.reference_number && ` · Ref: ${t.reference_number}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => setReceiptTx(t)} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors" aria-label="Download receipt">
                    <Upload className="w-3.5 h-3.5" /> Receipt
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {pastGroups.length > 0 && (
          <Section title="Past Assignments" icon={Clock} count={pastGroups.length}>
            <div className="divide-y divide-border">
              {pastGroups.map((g) => <ScheduleCard key={g.id} group={g} currency={currency} />)}
            </div>
          </Section>
        )}

        <PortalProviderCard workspace={workspace} />

        <PublicFooter secure="team portal" />
      </main>

      {/* Same receipt image the owner shares for a team payment from the event / Financial page. */}
      <PublicReceiptDialog
        open={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx ? { ...receiptTx, transaction_type: "TEAM_PAYMENT" } : null}
        event={receiptTx?.event_title ? { title: receiptTx.event_title } : null}
        workspace={workspace}
        currency={currency}
        particularFor={() => `Payment to ${member?.name || "Team member"}${member?.profession ? ` (${member.profession})` : ""}`}
        typeLabel={() => "Paid"}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  );
}

function EmptyMessage({ message }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{message}</div>;
}