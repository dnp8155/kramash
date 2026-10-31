import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currencyIcon } from "@/utils/currencyIcon";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import RoundIconButton from "@/components/common/RoundIconButton";
import EmptyState from "@/components/common/EmptyState";
import InvoicePrintView from "@/components/invoice/InvoicePrintView";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { eventFinancialSummary } from "@/lib/financeService";
import { invoiceBalance } from "@/lib/invoiceService";
import { deleteQuotation, loadQuotationItems, parseSnapshot } from "@/lib/quotationService";
import { generateQuotationPdf } from "@/lib/quotationPdf";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { formatMoney } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText, Receipt, CheckCircle2, Clock,
  Copy, Link as LinkIcon, Eye, Download, Pencil, Trash2,
  Users, TrendingUp, Briefcase, Loader2, ReceiptIndianRupee, Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { askConfirm } from "@/lib/confirmDialog";

const STATUS_STYLES = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  finalized: { bg: "bg-blue-50", text: "text-blue-700", label: "Finalized" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  sent: { bg: "bg-blue-50", text: "text-blue-700", label: "Sent" },
  due: { bg: "bg-blue-50", text: "text-blue-700", label: "Due" },
  overdue: { bg: "bg-red-50", text: "text-red-700", label: "Overdue" },
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
  serviceAssignments = [],
  currency, workspace, onRefresh,
  onShareDoc // (kind: "quotation" | "invoice", doc) => opens the WhatsApp / email sheet; left out when there is no client to send to
}) {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [busyQuotationId, setBusyQuotationId] = useState(null);

  const fin = useMemo(
    () => eventFinancialSummary(event, transactions, assignments, serviceAssignments),
    [event, transactions, assignments, serviceAssignments]
  );

  const packageValue = fin.contractValue || 0;
  const pct = (v) => packageValue > 0 ? Math.round((v / packageValue) * 100) : 0;
  const miscItems = useMemo(() => parseMiscExpenses(event?.misc_expenses_json), [event?.misc_expenses_json]);
  const miscTotal = miscExpensesTotal(miscItems);

  const { servicePayments, otherExpenses } = useMemo(() => {
    const evTx = (transactions || []).filter(
      (tx) => tx.event_id === event?.id && tx.status === "ACTIVE" && tx.transaction_type === "BUSINESS_EXPENSE"
    );
    let svc = 0;
    let other = 0;
    for (const tx of evTx) {
      const amt = Number(tx.amount) || 0;
      if (tx.service_assignment_id) svc += amt;
      else other += amt;
    }
    return { servicePayments: svc, otherExpenses: other };
  }, [transactions, event?.id]);

  const openInvoicePreview = async (inv) => {
    setPreviewInvoice(inv);
    setPreviewItems([]);
    try {
      const items = await base44.entities.InvoiceItem.filter({ invoice_id: inv.id }, "sort_order", 500);
      setPreviewItems(items || []);
    } catch {
      setPreviewItems([]);
    }
  };

  const copyInvoiceNumber = async (inv) => {
    try {
      await navigator.clipboard.writeText(inv.invoice_number || "");
      toast({ title: t("Invoice number copied") });
    } catch {
      toast({ title: t("Could not copy"), variant: "destructive" });
    }
  };

  const copyShareLink = async (inv) => {
    const url = `${window.location.origin}/invoices/${inv.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("Invoice link copied") });
    } catch {
      toast({ title: t("Could not copy"), variant: "destructive" });
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
    if (!await askConfirm(`${t("Delete invoice")} ${inv.invoice_number}? ${t("This cannot be undone.")}`)) return;
    setDeletingId(inv.id);
    try {
      await base44.entities.InvoiceItem.deleteMany({ invoice_id: inv.id });
      await base44.entities.Invoice.delete(inv.id);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice deleted") });
      onRefresh?.();
    } catch (e) {
      toast({ title: e?.message || t("Failed to delete"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyQuotationNumber = async (q) => {
    try {
      await navigator.clipboard.writeText(q.quotation_number || "");
      toast({ title: t("Quotation number copied") });
    } catch {
      toast({ title: t("Could not copy"), variant: "destructive" });
    }
  };

  const downloadQuotation = async (q) => {
    setBusyQuotationId(q.id);
    try {
      const items = await loadQuotationItems(workspace.id, q.id);
      await generateQuotationPdf({ quotation: q, items, workspace, client: parseSnapshot(q.client_snapshot), event, currency });
    } catch (e) {
      toast({ title: t("PDF generation failed"), description: e?.message, variant: "destructive" });
    } finally {
      setBusyQuotationId(null);
    }
  };

  const removeQuotation = async (q) => {
    if (!await askConfirm(`${t("Delete quotation")} ${q.quotation_number}? ${t("This cannot be undone.")}`)) return;
    setBusyQuotationId(q.id);
    try {
      await deleteQuotation(workspace.id, q.id);
      // Deleting a quotation can change the contract value, so the event and finance numbers refresh too.
      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "FinancialTransaction"]);
      toast({ title: t("Quotation deleted") });
      onRefresh?.();
    } catch (e) {
      toast({ title: t("Delete failed"), description: e?.message, variant: "destructive" });
    } finally {
      setBusyQuotationId(null);
    }
  };

  // Quotations and invoices share one list layout (DocList); only the rows and their actions differ.
  const quotationRows = quotations.map((q) => ({
    id: q.id,
    number: q.quotation_number,
    date: fmtDate(q.quotation_date),
    dateSub: q.valid_until ? `${t("Valid till")} ${fmtDate(q.valid_until)}` : "",
    amount: formatMoney(q.grand_total || 0, currency),
    amountSub: t("Grand Total"),
    status: q.status,
    onOpen: () => navigate(`/quotation/${q.id}`),
    actions: [
      { title: t("View"), icon: Eye, onClick: () => navigate(`/quotation/${q.id}`) },
      ...(onShareDoc ? [{ title: t("Share by WhatsApp or email"), icon: Share2, onClick: () => onShareDoc("quotation", q) }] : []),
      { title: t("Copy number"), icon: Copy, onClick: () => copyQuotationNumber(q) },
      { title: t("Download PDF"), icon: Download, onClick: () => downloadQuotation(q), loading: busyQuotationId === q.id },
      { title: t("Edit"), icon: Pencil, onClick: () => navigate(`/quotation/${q.id}`) },
      { title: t("Delete"), icon: Trash2, onClick: () => removeQuotation(q), danger: true, disabled: busyQuotationId === q.id },
    ],
  }));

  const invoiceRows = invoices.map((inv) => {
    const total = Number(inv.grand_total) || 0;
    const amountPaid = Number(inv.amount_paid) || 0;
    const balance = invoiceBalance(inv);
    const isFullyPaid = total > 0 && amountPaid > 0 && balance <= 0;
    return {
      id: inv.id,
      number: inv.invoice_number,
      date: fmtDate(inv.invoice_date),
      amount: formatMoney(inv.grand_total || 0, currency),
      amountSub: isFullyPaid ? t("Fully paid") : `${formatMoney(balance, currency)} ${t("due")}`,
      amountSubClass: isFullyPaid ? "text-success" : "text-warning",
      status: inv.status,
      onOpen: () => openInvoicePreview(inv),
      actions: [
        { title: t("View"), icon: Eye, onClick: () => openInvoicePreview(inv) },
        ...(onShareDoc ? [{ title: t("Share by WhatsApp or email"), icon: Share2, onClick: () => onShareDoc("invoice", inv) }] : []),
        { title: t("Copy number"), icon: Copy, onClick: () => copyInvoiceNumber(inv) },
        { title: t("Copy link"), icon: LinkIcon, onClick: () => copyShareLink(inv) },
        { title: t("Download / Print"), icon: Download, onClick: () => printInvoice(inv) },
        { title: t("Edit"), icon: Pencil, onClick: () => navigate(`/invoices/${inv.id}`) },
        { title: t("Delete"), icon: Trash2, onClick: () => deleteInvoice(inv), danger: true, loading: deletingId === inv.id },
      ],
    };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <FinCard label={t("Package")} value={formatMoney(packageValue, currency)} sub={(fin.addonTotal + fin.miscTotal) > 0 ? `${t("Base")} ${formatMoney(fin.baseContractValue, currency)} + ${t("Add-ons")} ${formatMoney(fin.addonTotal + fin.miscTotal, currency)}` : `${pct(packageValue)}% ${t("base")}`} icon={currencyIcon(currency)} />
        <FinCard label={t("Received")} value={formatMoney(fin.received, currency)} sub={`${pct(fin.received)}% ${t("collected")}`} icon={CheckCircle2} tone="default" />
        <FinCard label={t("Balance Due")} value={formatMoney(fin.pending, currency)} sub={`${pct(fin.pending)}% ${t("pending")}`} icon={Clock} tone={fin.pending > 0 ? "danger" : "success"} />
        <FinCard label={t("Team Cost")} value={formatMoney(fin.teamPaid, currency)} sub={`${pct(fin.teamPaid)}% ${t("of package")}`} icon={Users} tone="warning" />
        <FinCard label={t("Service Payments")} value={formatMoney(servicePayments, currency)} sub={`${pct(servicePayments)}% ${t("of package")}`} icon={Briefcase} tone="warning" />
        <FinCard label={t("Other Expenses")} value={formatMoney(otherExpenses, currency)} sub={`${pct(otherExpenses)}% ${t("of package")}`} icon={currencyIcon(currency)} />
        <FinCard label={t("Net Profit")} value={formatMoney(fin.profit, currency)} sub={`${pct(fin.profit)}% ${t("margin")}`} icon={TrendingUp} tone="success" />
      </div>

      {miscItems.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t("Add-ons")}</h3>
              <span className="text-xs text-muted-foreground">({miscItems.length})</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-foreground">+{formatMoney(miscTotal, currency)}</div>
              <div className="text-[11px] text-muted-foreground">{t("Added to contract")}</div>
            </div>
          </div>
          <div className="space-y-2">
            {miscItems.map((it, idx) => (
              <div key={it.id || idx} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{it.name || t("Unnamed expense")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("Add-on")}{it.notes ? ` · ${it.notes}` : ""}</div>
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  {formatMoney(Number(it.amount) || 0, currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("Quotations")}</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
            <FileText className="w-3.5 h-3.5" /> {t("New Quotation")}
          </Button>
        </div>
        <DocList
          rows={quotationRows}
          numberLabel={t("Quotation")}
          empty={<EmptyState title={t("No quotations")} description={t("Create a quotation for this project to track approved value.")} />}
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ReceiptIndianRupee className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("Invoices")}</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?event_id=${event.id}&client_id=${event.client_id || ""}`)}>
            <ReceiptIndianRupee className="w-3.5 h-3.5" /> {t("New Invoice")}
          </Button>
        </div>

        <DocList
          rows={invoiceRows}
          numberLabel={t("Invoice")}
          empty={<EmptyState title={t("No invoices")} description={t("Generate an invoice after a quotation is accepted.")} />}
        />
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
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <div className={cn("text-lg font-bold tabular-nums", toneClasses[tone])}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

// The circular bordered icon button used across the app, with a spinner while its action runs.
function RoundAction({ title, icon: Icon, onClick, danger, loading, disabled }) {
  return (
    <RoundIconButton
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={loading || disabled}
      className={cn("disabled:opacity-50", danger && "hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5")}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
    </RoundIconButton>
  );
}

const DOC_GRID = "md:grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr]";

function DocList({ rows, numberLabel, empty }) {
  const t = useT();
  if (rows.length === 0) return empty;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className={cn("hidden md:grid gap-3 px-4 py-2.5 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide", DOC_GRID)}>
        <div>{numberLabel}</div>
        <div>{t("Date")}</div>
        <div className="text-right">{t("Amount")}</div>
        <div>{t("Status")}</div>
        <div className="text-right">{t("Actions")}</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const st = STATUS_STYLES[row.status] || { ...STATUS_STYLES.draft, label: row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : "Draft" };
          return (
            <div key={row.id} className={cn("grid grid-cols-1 gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors", DOC_GRID)}>
              <div className="min-w-0">
                <button onClick={row.onOpen} className="font-mono text-sm font-medium text-foreground hover:text-primary transition-colors text-left">
                  {row.number}
                </button>
                <div className="md:hidden text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>{row.date}</span>
                  <span className="font-medium text-foreground">{row.amount}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", st.bg, st.text)}>{t(st.label)}</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-sm text-muted-foreground">{row.date}</div>
                {row.dateSub && <div className="text-[11px] text-muted-foreground mt-0.5">{row.dateSub}</div>}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold tabular-nums text-foreground">{row.amount}</div>
                <div className={cn("text-[11px]", row.amountSubClass || "text-muted-foreground")}>{row.amountSub}</div>
              </div>
              <div className="hidden md:block">
                <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium capitalize", st.bg, st.text)}>{t(st.label)}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                {row.actions.map((a) => <RoundAction key={a.title} {...a} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
