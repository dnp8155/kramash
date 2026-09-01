import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import InvoicePrintView from "@/components/invoice/InvoicePrintView";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { eventFinancialSummary } from "@/lib/financeService";
import { formatMoney } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText, Receipt, CheckCircle2, Clock, ArrowRight,
  Copy, Link as LinkIcon, Eye, Download, Pencil, Trash2,
  Users, Wallet, TrendingUp
} from "lucide-react";
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

export default function EventFinancialsTab({
  event, quotations, invoices, transactions, assignments,
  currency, workspace, onRefresh
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const fin = useMemo(
    () => eventFinancialSummary(event, transactions, assignments),
    [event, transactions, assignments]
  );

  const packageValue = fin.contractValue || 0;
  const pct = (v) => packageValue > 0 ? Math.round((v / packageValue) * 100) : 0;

  const openInvoicePreview = async (inv) => {
    setPreviewInvoice(inv);
    setPreviewItems([]);
    try {
      const items = await base44.entities.InvoiceItem.filter({ invoice_id: inv.id }, "sort_order", 500);
      setPreviewItems(items || []);
    } catch (e) {
      setPreviewItems([]);
    }
  };

  const copyInvoiceNumber = async (inv) => {
    try {
      await navigator.clipboard.writeText(inv.invoice_number || "");
      toast({ title: "Invoice number copied" });
    } catch (e) {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const copyShareLink = async (inv) => {
    const url = `${window.location.origin}/invoices/${inv.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Invoice link copied" });
    } catch (e) {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const printInvoice = async (inv) => {
    await openInvoicePreview(inv);
    setTimeout(() => {
      document.body.classList.add("printing-invoice");
      window.print();
      setTimeout(() => document.body.classList.remove("printing-invoice"), 600);
    }, 400);
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) return;
    setDeletingId(inv.id);
    try {
      await base44.entities.InvoiceItem.deleteMany({ invoice_id: inv.id });
      await base44.entities.Invoice.delete(inv.id);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: "Invoice deleted" });
      onRefresh?.();
    } catch (e) {
      toast({ title: e?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* 6 Financial summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinCard label="Package" value={formatMoney(packageValue, currency)} sub={`${pct(packageValue)}% base`} icon={Wallet} />
        <FinCard label="Received" value={formatMoney(fin.received, currency)} sub={`${pct(fin.received)}% collected`} icon={CheckCircle2} tone="default" />
        <FinCard label="Balance Due" value={formatMoney(fin.pending, currency)} sub={`${pct(fin.pending)}% pending`} icon={Clock} tone={fin.pending > 0 ? "danger" : "success"} />
        <FinCard label="Team Cost" value={formatMoney(fin.teamPaid, currency)} sub={`${pct(fin.teamPaid)}% of package`} icon={Users} tone="warning" />
        <FinCard label="Other Expenses" value={formatMoney(fin.expenses, currency)} sub={`${pct(fin.expenses)}% of package`} icon={Receipt} />
        <FinCard label="Net Profit" value={formatMoney(fin.profit, currency)} sub={`${pct(fin.profit)}% margin`} icon={TrendingUp} tone="success" />
      </div>

      {/* Quotations */}
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

      {/* Invoices — table with inline actions */}
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
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header row (desktop) */}
            <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr] gap-3 px-4 py-2.5 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <div>Invoice</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {invoices.map((inv) => {
                const st = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                const balance = inv.balance_due || 0;
                return (
                  <div key={inv.id} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors">
                    {/* Invoice number + mobile meta */}
                    <div className="min-w-0">
                      <button onClick={() => openInvoicePreview(inv)} className="font-mono text-sm font-medium text-foreground hover:text-primary transition-colors text-left">
                        {inv.invoice_number}
                      </button>
                      <div className="md:hidden text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>{fmtDate(inv.invoice_date)}</span>
                        <span className="font-medium text-foreground">{formatMoney(inv.grand_total || 0, currency)}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", st.bg, st.text)}>{st.label}</span>
                      </div>
                    </div>
                    <div className="hidden md:block text-sm text-muted-foreground">{fmtDate(inv.invoice_date)}</div>
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-bold tabular-nums text-foreground">{formatMoney(inv.grand_total || 0, currency)}</div>
                      <div className={cn("text-[11px]", balance > 0 ? "text-warning" : "text-success")}>
                        {balance > 0 ? `${formatMoney(balance, currency)} due` : "Fully paid"}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium capitalize", st.bg, st.text)}>{st.label}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <ActionButton title="View" icon={Eye} onClick={() => openInvoicePreview(inv)} />
                      <ActionButton title="Copy number" icon={Copy} onClick={() => copyInvoiceNumber(inv)} />
                      <ActionButton title="Copy link" icon={LinkIcon} onClick={() => copyShareLink(inv)} />
                      <ActionButton title="Download / Print" icon={Download} onClick={() => printInvoice(inv)} />
                      <ActionButton title="Edit" icon={Pencil} onClick={() => navigate(`/invoices/${inv.id}`)} />
                      <ActionButton title="Delete" icon={Trash2} onClick={() => deleteInvoice(inv)} danger loading={deletingId === inv.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {previewInvoice && (
        <InvoicePrintView
          open={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          items={previewItems}
          workspace={workspace}
          currency={currency}
          onEdit={() => navigate(`/invoices/${previewInvoice.id}`)}
        />
      )}
    </div>
  );
}

function FinCard({ label, value, sub, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive"
  };
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

function ActionButton({ title, icon: Icon, onClick, danger, loading }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "w-8 h-8 rounded-md flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50",
        danger && "hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
      )}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
    </button>
  );
}