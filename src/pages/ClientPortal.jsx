import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { getPortalSession, clearPortalSession } from "@/lib/portalSession";
import { loadClientPortalData } from "@/lib/clientPortalAccess";
import { Image } from "@/components/ui/image";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import {
  Calendar, FileText, Receipt, Wallet, LogOut, ExternalLink,
  MapPin, CheckCircle2, Phone, Mail, ShieldCheck, ShieldOff
} from "lucide-react";
import { formatMoney, setNumberFormat } from "@/utils/format";
import { formatDate as formatDateShared, formatDatesList, setDateFormat } from "@/lib/dates";

function money(n, currency) {
  return formatMoney(n, currency);
}

function formatDate(d) {
  if (!d) return "—";
  return formatDateShared(d);
}

// The actual selected dates — never a "start – end" range. Falls back to
// just the start date for older events saved before event_dates was tracked.
function formatEventDates(e) {
  const dates = Array.isArray(e.event_dates) && e.event_dates.length > 0 ? e.event_dates : [e.start_date].filter(Boolean);
  return formatDatesList(dates);
}

const EVENT_STATUS_META = {
  upcoming: { label: "Upcoming", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" }
};

const QUOTATION_STATUS_META = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  finalized: { label: "Awaiting Your Approval", color: "text-amber-700", bg: "bg-amber-50" },
  accepted: { label: "Accepted", color: "text-emerald-700", bg: "bg-emerald-50" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50" },
  expired: { label: "Expired", color: "text-slate-600", bg: "bg-slate-100" },
  cancelled: { label: "Cancelled", color: "text-slate-600", bg: "bg-slate-100" }
};

const INVOICE_STATUS_META = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  due: { label: "Due", color: "text-amber-700", bg: "bg-amber-50" },
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50" },
  paid: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { label: "Partially Paid", color: "text-orange-700", bg: "bg-orange-50" },
  overdue: { label: "Overdue", color: "text-red-700", bg: "bg-red-50" },
  cancelled: { label: "Cancelled", color: "text-slate-600", bg: "bg-slate-100" }
};

export default function ClientPortal() {
  const { logout, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  useEffect(() => {
    document.title = data?.workspace?.name ? `${data.workspace.name} - Client Portal` : "Client Portal";
  }, [data?.workspace?.name]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const portalSession = getPortalSession();
        if (!portalSession) { setError("Your portal session has expired. Please sign in again."); return; }
        const d = await loadClientPortalData(portalSession.token, portalSession.client_id);
        setData(d);
        setDateFormat(d?.workspace?.date_format);
        setNumberFormat(d?.workspace?.number_format);
        if (d?.auto_linked) { toast({ title: "Welcome to your portal!", description: "Your account has been linked successfully." }); checkUserAuth(); }
      } catch (e) { setError(e?.message || e?.data?.error || "Failed to load your portal data"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleLogout = () => { clearPortalSession(); if (logout) logout(false); window.location.href = "/"; };

  if (loading) {
    return <PortalPageSkeleton maxWidth="max-w-5xl" statCards={4} />;
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-sm font-semibold text-foreground mb-4 flex items-center gap-1.5">
          Kramasha <span className="text-muted-foreground text-xs font-normal">•</span> <span className="text-muted-foreground font-normal">Client Portal</span>
        </div>
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ShieldOff className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">This portal is no longer available</h2>
          <p className="text-sm text-muted-foreground">
            Your access may have been disabled, or your session has expired. Please sign in again, or contact your service provider if you think this is a mistake.
          </p>
          <button onClick={handleLogout} className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors mt-2">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { client, workspace, summary, events, transactions } = data;
  // Drafts are never shown to a client (also filtered on the server).
  const quotations = (data.quotations || []).filter((q) => q.status !== "draft");
  const invoices = (data.invoices || []).filter((inv) => inv.status !== "draft");
  const currency = workspace?.currency || "INR";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10 safe-area-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {workspace?.logo ? (
              <Image src={workspace.logo} alt={workspace.name} fittingType="fit" className="w-9 h-9 rounded-lg border border-border object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0"><span className="text-primary-foreground text-sm font-bold">{(workspace?.name || "K").charAt(0).toUpperCase()}</span></div>
            )}
            <div className="min-w-0"><div className="text-sm font-semibold text-foreground truncate">{workspace?.name || "Client Portal"}</div><div className="text-xs text-muted-foreground truncate">Welcome, {client?.name || "Client"}</div></div>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors shrink-0"><LogOut className="w-3.5 h-3.5" /> Logout</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard icon={Calendar} label="Projects" value={summary.totalEvents} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard icon={FileText} label="Total Quoted" value={money(summary.totalQuoted, currency)} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard icon={Receipt} label="Total Invoiced" value={money(summary.totalInvoiced, currency)} color="text-purple-600" bg="bg-purple-50" />
          <SummaryCard icon={Wallet} label="Balance Due" value={money(summary.balanceDue, currency)} color="text-red-600" bg="bg-red-50" />
        </div>

        <Section title="Your Projects" icon={Calendar} count={events?.length || 0}>
          {(!events || events.length === 0) ? <EmptyMessage message="No projects yet." /> : (
            <div className="divide-y divide-border">
              {events.map((e) => {
                const meta = EVENT_STATUS_META[e.status] || EVENT_STATUS_META.upcoming;
                return (
                  <div key={e.id} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatEventDates(e)}</span>
                        {e.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.venue}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {e.contract_value > 0 && <div className="text-xs text-muted-foreground mt-1">{money(e.contract_value, currency)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Quotations" icon={FileText} count={quotations?.length || 0}>
          {(!quotations || quotations.length === 0) ? <EmptyMessage message="No quotations yet." /> : (
            <div className="divide-y divide-border">
              {quotations.map((q) => {
                const meta = QUOTATION_STATUS_META[q.status] || QUOTATION_STATUS_META.draft;
                // The whole row opens the quotation when the client is allowed to view it.
                // A logged-in client always reaches their own finalized/accepted quotation (the share-link switch is for outside viewers).
                const href = q.public_token && (q.status === 'finalized' || q.status === 'accepted')
                  ? `${window.location.origin}/q/${q.public_token}` : "";
                const Row = href ? "a" : "div";
                return (
                  <Row key={q.id} {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})} className={`flex items-start gap-3 py-3 ${href ? "-mx-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" : ""}`}>
                    <FileText className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{q.project_title || `Quotation ${q.quotation_number}`}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{q.quotation_number} · {formatDate(q.quotation_date)}</div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      <div className="text-xs font-medium text-foreground">{money(q.grand_total, currency)}</div>
                      {href && (
                        <span className="text-xs text-primary flex items-center gap-0.5">View <ExternalLink className="w-3 h-3" /></span>
                      )}
                    </div>
                  </Row>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Invoices" icon={Receipt} count={invoices?.length || 0}>
          {(!invoices || invoices.length === 0) ? <EmptyMessage message="No invoices yet." /> : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.draft;
                return (
                  <div key={inv.id} className="flex items-start gap-3 py-3">
                    <Receipt className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.invoice_date)}{inv.due_date && ` · Due ${formatDate(inv.due_date)}`}</div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      <div className="text-xs font-medium text-foreground">{money(inv.grand_total, currency)}</div>
                      {inv.balance_due > 0 && <div className="text-xs text-red-600">Balance: {money(inv.balance_due, currency)}</div>}
                      {inv.public_link_enabled && inv.public_token && (
                        <a href={`${window.location.origin}/invoice/${inv.public_token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">View <ExternalLink className="w-3 h-3" /></a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Payment History" icon={Wallet} count={transactions?.length || 0}>
          {(!transactions || transactions.length === 0) ? <EmptyMessage message="No payments recorded yet." /> : (
            <div className="divide-y divide-border">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{money(t.amount, currency)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(t.transaction_date)} · {t.payment_method}{t.reference_number && ` · Ref: ${t.reference_number}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {(workspace?.phone || workspace?.email) && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact Your Service Provider</div>
            <div className="flex flex-wrap gap-4">
              {workspace?.phone && <a href={`tel:${workspace.phone}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"><Phone className="w-3.5 h-3.5" /> {workspace.phone}</a>}
              {workspace?.email && <a href={`mailto:${workspace.email}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"><Mail className="w-3.5 h-3.5" /> {workspace.email}</a>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure client portal powered by Kramasha
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (<div className="bg-card border border-border rounded-xl p-4"><div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${color}`} /></div><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-bold text-foreground mt-0.5">{value}</div></div>);
}

function Section({ title, icon: Icon, count, children }) {
  return (<div className="bg-card border border-border rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-muted-foreground" /><h2 className="text-sm font-semibold text-foreground">{title}</h2><span className="text-xs text-muted-foreground">({count})</span></div>{children}</div>);
}

function EmptyMessage({ message }) { return <div className="py-6 text-center text-sm text-muted-foreground">{message}</div>; }