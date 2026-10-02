import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import InvoicesPageSkeleton from "@/components/invoice/InvoicesPageSkeleton";
import RetryState from "@/components/common/RetryState";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import { usePartialErrorToast } from "@/hooks/usePartialErrorToast";
import { formatMoney } from "@/utils/format";
import { loadInvoices, deleteInvoice, duplicateInvoice, parseSnapshot } from "@/lib/invoiceService";
import { base44 } from "@/api/base44Client";
import { Plus, Search, X, Trash2, FileText, FileSpreadsheet, IndianRupee, CheckCircle2, Clock, Printer, Copy } from "lucide-react";
import { exportInvoicesXlsx } from "@/lib/exportUtils";
import { useFeatureGate } from "@/components/common/ProGate";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { loadInvoice } from "@/lib/invoiceService";
import InvoicePrintView from "@/components/invoice/InvoicePrintView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useT } from "@/hooks/useT";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const INVOICE_STATUSES = ["draft", "due", "sent", "partial", "paid", "overdue", "cancelled"];
const INVOICE_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  due: { label: "Due", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  sent: { label: "Sent", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  partial: { label: "Partial", className: "bg-badge-progress-bg text-badge-progress-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" }
};

export default function Invoices() {
  const t = useT();
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const queryClient = useQueryClient();
  usePageTitle(t("Invoices"));
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printItems, setPrintItems] = useState([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: async () => {
      // Staggered (waveSize=2, 300ms delay) — spaces out calls to avoid 429.
      const results = await staggeredAllSettled(
        [
          () => loadInvoices(workspaceId),
          () => base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
        ],
        { waveSize: 1, waveDelay: 300 }
      );
      const [invsR, clR, evR] = results;
      const partialError = results.some((r) => r.status === "rejected");
      return {
        invoices: invsR.status === "fulfilled" ? (invsR.value || []) : [],
        clients: clR.status === "fulfilled" ? (clR.value || []) : [],
        events: evR.status === "fulfilled" ? (evR.value || []) : [],
        partialError
      };
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev
  });

  const invoices = data?.invoices || [];
  const clients = data?.clients || [];
  const events = data?.events || [];
  const partialError = data?.partialError;

  usePartialErrorToast(partialError, error, !!data, () => queryClient.invalidateQueries({ queryKey: ["invoices", workspaceId] }));

  const clientsById = useMemo(() => {
    const m = {};
    for (const c of clients) m[c.id] = c;
    return m;
  }, [clients]);
  const eventsById = useMemo(() => {
    const m = {};
    for (const e of events) m[e.id] = e;
    return m;
  }, [events]);

  const clientNameFor = (inv) => clientsById[inv.client_id]?.name || parseSnapshot(inv.client_snapshot)?.name || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [inv.invoice_number, clientNameFor(inv), inv.status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [invoices, search, statusFilter, clientsById]);

  const stats = useMemo(() => {
    const totalValue = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
    const draftCount = invoices.filter((i) => i.status === "draft").length;
    const sentCount = invoices.filter((i) => i.status === "sent").length;
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const outstandingAmount = invoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
    return { totalValue, draftCount, sentCount, paidCount, outstandingAmount };
  }, [invoices]);

  const onDelete = async (inv) => {
    if (!window.confirm(`${t("Delete invoice")} ${inv.invoice_number}? ${t("This cannot be undone.")}`)) return;
    try {
      await deleteInvoice(workspaceId, inv.id);
      toast({ title: t("Invoice deleted") });
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
    } catch (e) {
      toast({ title: t("Delete failed"), description: e?.message, variant: "destructive" });
    }
  };

  const onCopy = async (inv) => {
    try {
      const copy = await duplicateInvoice(workspaceId, inv.id);
      toast({ title: t("Invoice copied"), description: `${t("Created")} ${copy.invoice_number}` });
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      navigate(`/invoices/${copy.id}`);
    } catch (e) {
      toast({ title: t("Copy failed"), description: e?.message, variant: "destructive" });
    }
  };

  const onPrint = async (inv) => {
    try {
      const result = await loadInvoice(workspaceId, inv.id);
      if (!result) { toast({ title: t("Could not load invoice"), variant: "destructive" }); return; }
      setPrintInvoice(result.invoice);
      setPrintItems(result.items || []);
    } catch (e) {
      toast({ title: t("Failed to load invoice"), variant: "destructive" });
    }
  };

  if (isLoading) return <InvoicesPageSkeleton />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <PageHeader eyebrow={t("Sales")} title={t("Invoices")} subtitle={t("Create and track client invoices from approved quotations.")} />
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["invoices", workspaceId] })} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader eyebrow={t("Sales")} title={t("Invoices")} subtitle={t("Create and track client invoices from approved quotations.")}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return; exportInvoicesXlsx(filtered, clientsById, eventsById); }} disabled={filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4" /> {t("Export")}
          </Button>
          <Button onClick={() => navigate("/invoices/new")}><Plus className="w-4 h-4" /> {t("Create Invoice")}</Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("Total Invoices")} value={invoices.length} icon={FileText} tone="primary" />
        <StatCard label={t("Total Value")} value={formatMoney(stats.totalValue, currency)} icon={IndianRupee} tone="success" />
        <StatCard label={t("Paid")} value={stats.paidCount} icon={CheckCircle2} tone="success" />
        <StatCard label={t("Outstanding")} value={formatMoney(stats.outstandingAmount, currency)} icon={Clock} tone="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by number, client…")}
            className={cn("pl-9", search && "pr-9")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors"
              aria-label={t("Clear search")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="All">{t("All statuses")}</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{t(INVOICE_STATUS_META[s].label)}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={invoices.length === 0 ? t("No invoices yet") : t("No invoices match your search")}
          description={invoices.length === 0 ? t("Create an invoice from an approved quotation or from scratch.") : t("Try a different search or filter.")}
          action={invoices.length === 0 ? <Button onClick={() => navigate("/invoices/new")}><Plus className="w-4 h-4" /> {t("Create Invoice")}</Button> : null}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((inv) => {
              const ev = eventsById[inv.event_id];
              const balance = Number(inv.balance_due) || 0;
              return (
                <div key={inv.id} className="bg-card border border-border rounded-[15px] p-4 shadow-card cursor-pointer sm:hover:shadow-card-hover transition-shadow" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-medium text-foreground">{inv.invoice_number}</span>
                    <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", INVOICE_STATUS_META[inv.status]?.className)}>
                      {INVOICE_STATUS_META[inv.status]?.label ? t(INVOICE_STATUS_META[inv.status].label) : inv.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-foreground">{clientNameFor(inv) || "—"}</div>
                  <div className="text-xs text-muted-foreground">{ev?.title ? `${ev.title} · ` : ""}{fmtDate(inv.invoice_date)}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{formatMoney(inv.grand_total, currency)}</span>
                      {balance > 0 && inv.status !== "cancelled" && (
                        <span className="text-xs text-warning font-medium">{t("Due")}: {formatMoney(balance, currency)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); onPrint(inv); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors" title={t("View / Print")}>
                        <Printer className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onCopy(inv); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors" title={t("Copy Invoice")}>
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(inv); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-destructive transition-colors" title={t("Delete")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-card border border-border rounded-[15px] overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-[0.08em] border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">{t("Invoice No")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("Client")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("Work")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("Date")}</th>
                    <th className="text-right px-4 py-3 font-semibold">{t("Total")}</th>
                    <th className="text-right px-4 py-3 font-semibold">{t("Balance Due")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("Status")}</th>
                    <th className="px-4 py-3 font-semibold w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const ev = eventsById[inv.event_id];
                    const balance = Number(inv.balance_due) || 0;
                    const isPaid = inv.status === "paid" || (balance === 0 && inv.status !== "cancelled");
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border last:border-0 sm:hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="px-4 py-3.5 font-mono font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="px-4 py-3.5 text-foreground">{clientNameFor(inv) || "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[160px]">{ev?.title || "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium tabular-nums text-foreground">{formatMoney(inv.grand_total, currency)}</td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                          <span className={cn("font-semibold", balance > 0 && inv.status !== "cancelled" ? "text-warning" : isPaid ? "text-success" : "text-muted-foreground")}>
                            {formatMoney(balance, currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("text-[11px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide", INVOICE_STATUS_META[inv.status]?.className)}>
                            {INVOICE_STATUS_META[inv.status]?.label ? t(INVOICE_STATUS_META[inv.status].label) : inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => onPrint(inv)} className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors" title={t("View / Print")}>
                              <Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => onCopy(inv)} className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors" title={t("Copy Invoice")}>
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(inv)} className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-destructive transition-colors" title={t("Delete")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {printInvoice && (
        <InvoicePrintView
          open={!!printInvoice}
          onClose={() => { setPrintInvoice(null); setPrintItems([]); }}
          invoice={printInvoice}
          items={printItems}
          workspace={workspace}
          currency={currency}
        />
      )}
      {FeatureGateDialog}
    </div>
  );
}