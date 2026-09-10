import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";
import {
  Calendar, FileText, Receipt, Wallet, Loader2, LogOut, ExternalLink,
  MapPin, CheckCircle2, Clock, AlertCircle, Phone, Mail
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
  const { user, logout, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Client Portal";
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
        const res = await base44.functions.invoke("getClientPortalData", {});
        setData(res.data);
        // If the user was auto-linked (role upgraded to client), refresh the auth
        // context so the user object reflects the new role.
        if (res.data?.auto_linked) {
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
    logout(false);
    window.location.href = "/client-login";
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

  const { client, workspace, summary, events, quotations, invoices, transactions } = data;
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
              <div className="text-sm font-semibold text-foreground truncate">{workspace?.name || "Client Portal"}</div>
              <div className="text-xs text-muted-foreground truncate">Welcome, {client?.name || "Client"}</div>
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
          <SummaryCard icon={Calendar} label="Projects" value={summary.totalEvents} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard icon={FileText} label="Total Quoted" value={money(summary.totalQuoted, currency)} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard icon={Receipt} label="Total Invoiced" value={money(summary.totalInvoiced, currency)} color="text-purple-600" bg="bg-purple-50" />
          <SummaryCard icon={Wallet} label="Balance Due" value={money(summary.balanceDue, currency)} color="text-red-600" bg="bg-red-50" />
        </div>

        {/* Events */}
        <Section title="Your Projects" icon={Calendar} count={events?.length || 0}>
          {(!events || events.length === 0) ? (
            <EmptyMessage message="No projects yet." />
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => {
                const meta = EVENT_STATUS_META[e.status] || EVENT_STATUS_META.upcoming;
                return (
                  <div key={e.id} className="flex items-start gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full ${meta.dot} mt-2 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateRange(e.start_date, e.end_date)}</span>
                        {e.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.venue}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {e.contract_value > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">{money(e.contract_value, currency)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Quotations */}
        <Section title="Quotations" icon={FileText} count={quotations?.length || 0}>
          {(!quotations || quotations.length === 0) ? (
            <EmptyMessage message="No quotations yet." />
          ) : (
            <div className="divide-y divide-border">
              {quotations.map((q) => {
                const meta = QUOTATION_STATUS_META[q.status] || QUOTATION_STATUS_META.draft;
                return (
                  <div key={q.id} className="flex items-start gap-3 py-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {q.project_title || `Quotation ${q.quotation_number}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {q.quotation_number} · {formatDate(q.quotation_date)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      <div className="text-xs font-medium text-foreground">{money(q.grand_total, currency)}</div>
                      {q.public_link_enabled && q.public_token && (q.status === 'finalized' || q.status === 'accepted') && (
                        <a
                          href={`${window.location.origin}/q/${q.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Invoices */}
        <Section title="Invoices" icon={Receipt} count={invoices?.length || 0}>
          {(!invoices || invoices.length === 0) ? (
            <EmptyMessage message="No invoices yet." />
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.draft;
                return (
                  <div key={inv.id} className="flex items-start gap-3 py-3">
                    <Receipt className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(inv.invoice_date)}
                        {inv.due_date && ` · Due ${formatDate(inv.due_date)}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      <div className="text-xs font-medium text-foreground">{money(inv.grand_total, currency)}</div>
                      {inv.balance_due > 0 && (
                        <div className="text-xs text-red-600">Balance: {money(inv.balance_due, currency)}</div>
                      )}
                      {inv.public_link_enabled && inv.public_token && (
                        <a
                          href={`${window.location.origin}/invoice/${inv.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        >
                          View <ExternalLink className="w-3 h-3" />
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
        <Section title="Payment History" icon={Wallet} count={transactions?.length || 0}>
          {(!transactions || transactions.length === 0) ? (
            <EmptyMessage message="No payments recorded yet." />
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((t) => (
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