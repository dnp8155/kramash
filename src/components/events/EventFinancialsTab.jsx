import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { FileText, Receipt, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  finalized: { bg: "bg-blue-50", text: "text-blue-700", label: "Finalized" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  sent: { bg: "bg-blue-50", text: "text-blue-700", label: "Sent" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
  partial: { bg: "bg-amber-50", text: "text-amber-700", label: "Partial" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" }
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function EventFinancialsTab({ event, quotations, invoices, currency }) {
  const navigate = useNavigate();

  const summary = useMemo(() => {
    const acceptedQuotes = quotations.filter((q) => q.status === "accepted");
    const totalQuoted = quotations.reduce((s, q) => s + (q.grand_total || 0), 0);
    const totalAccepted = acceptedQuotes.reduce((s, q) => s + (q.grand_total || 0), 0);
    const totalInvoiced = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const totalInvoicePaid = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
    const totalInvoiceBalance = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);
    return {
      totalQuoted,
      totalAccepted,
      totalInvoiced,
      totalInvoicePaid,
      totalInvoiceBalance,
      acceptedCount: acceptedQuotes.length,
      invoiceCount: invoices.length
    };
  }, [quotations, invoices]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Quoted" value={formatMoney(summary.totalQuoted, currency)} sub={`${quotations.length} quotation${quotations.length !== 1 ? "s" : ""}`} icon={FileText} />
        <SummaryCard label="Accepted Value" value={formatMoney(summary.totalAccepted, currency)} sub={`${summary.acceptedCount} accepted`} icon={CheckCircle2} tone="success" />
        <SummaryCard label="Total Invoiced" value={formatMoney(summary.totalInvoiced, currency)} sub={`${summary.invoiceCount} invoice${summary.invoiceCount !== 1 ? "s" : ""}`} icon={Receipt} />
        <SummaryCard label="Invoice Balance" value={formatMoney(summary.totalInvoiceBalance, currency)} sub={`${formatMoney(summary.totalInvoicePaid, currency)} paid`} icon={Clock} tone={summary.totalInvoiceBalance > 0 ? "warning" : "success"} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Quotations</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
            <FileText className="w-3.5 h-3.5" /> New Quotation
          </Button>
        </div>
        {quotations.length === 0 ? (
          <EmptyState title="No quotations" description="Create a quotation for this project to track approved value." />
        ) : (
          <div className="space-y-2">
            {quotations.map((q) => {
              const st = STATUS_STYLES[q.status] || STATUS_STYLES.draft;
              return (
                <button key={q.id} onClick={() => navigate(`/quotation/${q.id}`)} className="w-full flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-medium text-foreground">{q.quotation_number}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", st.bg, st.text)}>{st.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fmtDate(q.quotation_date)}{q.valid_until ? ` · Valid till ${fmtDate(q.valid_until)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-foreground">{formatMoney(q.grand_total || 0, currency)}</div>
                      <div className="text-[11px] text-muted-foreground">Grand Total</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?event_id=${event.id}&client_id=${event.client_id || ""}`)}>
            <Receipt className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>
        {invoices.length === 0 ? (
          <EmptyState title="No invoices" description="Generate an invoice after a quotation is accepted." />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const st = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
              const balance = inv.balance_due || 0;
              return (
                <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="w-full flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-medium text-foreground">{inv.invoice_number}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", st.bg, st.text)}>{st.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fmtDate(inv.invoice_date)}{inv.due_date ? ` · Due ${fmtDate(inv.due_date)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-foreground">{formatMoney(inv.grand_total || 0, currency)}</div>
                      <div className={cn("text-[11px]", balance > 0 ? "text-warning" : "text-success")}>
                        {balance > 0 ? `${formatMoney(balance, currency)} due` : "Fully paid"}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, tone = "default" }) {
  const toneClasses = { success: "text-success", warning: "text-warning", default: "text-foreground" };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <div className={cn("text-lg font-bold tabular-nums", toneClasses[tone])}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}