import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { getTeamPortalSession, clearTeamPortalSession } from "@/lib/teamPortalSession";
import { Image } from "@/components/ui/image";
import {
  Calendar, Wallet, Loader2, LogOut, MapPin, CheckCircle2,
  AlertCircle, Phone, Mail, Briefcase, Clock, TrendingUp, ClipboardList
} from "lucide-react";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function formatDateRange(start, end) {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

const EVENT_STATUS_META = {
  upcoming: { label: "Upcoming", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  postponed: { label: "Postponed", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" }
};

export default function TeamMemberPortal() {
  const { user, logout, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Team Portal";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const portalSession = getTeamPortalSession();
        const res = portalSession
          ? await base44.functions.invoke("getTeamPortalDataByAccess", {
              session_token: portalSession.token,
              team_member_id: portalSession.team_member_id
            })
          : await base44.functions.invoke("getTeamPortalData", {});
        const d = res?.data || res;
        setData(d);
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
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your portal…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={handleLogout} className="text-sm text-primary underline">Back to login</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { member, workspace, summary, upcoming, past, projects, payments } = data;
  const currency = workspace?.currency || "INR";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {workspace?.logo ? (
              <Image
                src={workspace.logo}
                alt={workspace.name}
                fittingType="fit"
                className="w-9 h-9 rounded-lg border border-border object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm font-bold">
                  {(workspace?.name || "K").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{workspace?.name || "Team Portal"}</div>
              <div className="text-xs text-muted-foreground truncate">Welcome, {member?.name || "Team Member"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard icon={Calendar} label="Total Bookings" value={summary.totalBookings} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard icon={Clock} label="Upcoming" value={summary.upcomingCount} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard icon={TrendingUp} label="Total Earnings" value={money(summary.totalEarnings, currency)} color="text-emerald-600" bg="bg-emerald-50" />
          <SummaryCard icon={Wallet} label="Remaining" value={money(summary.remaining, currency)} color="text-red-600" bg="bg-red-50" />
        </div>

        {/* Upcoming Schedule */}
        <Section title="Upcoming Schedule" icon={Calendar} count={upcoming?.length || 0}>
          {(!upcoming || upcoming.length === 0) ? (
            <EmptyMessage message="No upcoming assignments." />
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((s) => {
                const meta = EVENT_STATUS_META[s.event_status] || EVENT_STATUS_META.upcoming;
                return (
                  <div key={s.id} className="flex items-start gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full ${meta.dot} mt-2 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{s.event_title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateRange(s.start_date, s.end_date)}</span>
                        {s.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.venue}</span>}
                        {s.role_name && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {s.role_name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {s.agreed_rate > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">{money(s.agreed_rate, currency)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Projects */}
        <Section title="Your Projects" icon={Briefcase} count={projects?.length || 0}>
          {(!projects || projects.length === 0) ? (
            <EmptyMessage message="No projects assigned yet." />
          ) : (
            <div className="divide-y divide-border">
              {projects.map((p) => {
                const meta = EVENT_STATUS_META[p.status] || EVENT_STATUS_META.upcoming;
                return (
                  <div key={p.id} className="flex items-start gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full ${meta.dot} mt-2 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateRange(p.start_date, p.end_date)}</span>
                        {p.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.venue}</span>}
                        {p.roles?.length > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {p.roles.join(", ")}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {p.total_earnings > 0 && (
                        <div className="text-xs text-muted-foreground">{money(p.total_earnings, currency)}</div>
                      )}
                      {p.job_sheet_token && (
                        <a
                          href={`/job-sheet/${p.job_sheet_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
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

        {/* Payment History */}
        <Section title="Payment History" icon={Wallet} count={payments?.length || 0}>
          {(!payments || payments.length === 0) ? (
            <EmptyMessage message="No payments recorded yet." />
          ) : (
            <div className="divide-y divide-border">
              {payments.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{money(t.amount, currency)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(t.transaction_date)} · {t.payment_method}
                      {t.reference_number && ` · Ref: ${t.reference_number}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Past Assignments */}
        {past && past.length > 0 && (
          <Section title="Past Assignments" icon={Clock} count={past.length}>
            <div className="divide-y divide-border">
              {past.map((s) => {
                const meta = EVENT_STATUS_META[s.event_status] || EVENT_STATUS_META.completed;
                return (
                  <div key={s.id} className="flex items-start gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full ${meta.dot} mt-2 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{s.event_title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateRange(s.start_date, s.end_date)}</span>
                        {s.role_name && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {s.role_name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {s.agreed_rate > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">{money(s.agreed_rate, currency)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Workspace Contact */}
        {(workspace?.phone || workspace?.email) && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact Your Service Provider</div>
            <div className="flex flex-wrap gap-4">
              {workspace?.phone && (
                <a href={`tel:${workspace.phone}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary">
                  <Phone className="w-3.5 h-3.5" /> {workspace.phone}
                </a>
              )}
              {workspace?.email && (
                <a href={`mailto:${workspace.email}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary">
                  <Mail className="w-3.5 h-3.5" /> {workspace.email}
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
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
    <div className="bg-card border border-border rounded-xl p-4">
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
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">{message}</div>
  );
}