import { currencyIcon } from "@/utils/currencyIcon";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import QuotationPageSkeleton from "@/components/quotation/QuotationPageSkeleton";
import RetryState from "@/components/common/RetryState";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import { usePartialErrorToast } from "@/hooks/usePartialErrorToast";
import { formatMoney } from "@/utils/format";
import { loadQuotations, deleteQuotation, loadQuotationItems, duplicateQuotation, parseSnapshot } from "@/lib/quotationService";
import { createFromQuotation } from "@/lib/invoiceService";
import { QUOTATION_STATUSES, QUOTATION_STATUS_META } from "@/constants/quotationConfig";
import { generateQuotationPdf } from "@/lib/quotationPdf";
import { base44 } from "@/api/base44Client";
import { Plus, Search, X, Trash2, FileDown, Eye, FileText, FileSpreadsheet, CheckCircle2, Pencil, Receipt, Copy } from "lucide-react";
import { exportQuotationsXlsx } from "@/lib/exportUtils";
import { useFeatureGate } from "@/components/common/ProGate";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useT } from "@/hooks/useT";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Quotation() {
  const t = useT();
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const term = useBusinessTerminology();
  usePageTitle(t("Quotations"));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [generatingId, setGeneratingId] = useState("");
  const [preview, setPreview] = useState({ url: "", filename: "", open: false, loading: false });
  const queryClient = useQueryClient();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["quotations", workspaceId],
    queryFn: async () => {
      // Staggered (waveSize=2, 300ms delay) — spaces out calls to avoid 429.
      const results = await staggeredAllSettled(
        [
          () => loadQuotations(workspaceId),
          () => base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
        ],
        { waveSize: 1, waveDelay: 300 }
      );
      const [qsR, clR, evR] = results;
      const partialError = results.some((r) => r.status === "rejected");
      return {
        quotations: qsR.status === "fulfilled" ? (qsR.value || []) : [],
        clients: clR.status === "fulfilled" ? (clR.value || []) : [],
        events: evR.status === "fulfilled" ? (evR.value || []) : [],
        partialError
      };
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev
  });

  const quotations = data?.quotations || [];
  const clients = data?.clients || [];
  const events = data?.events || [];
  const partialError = data?.partialError;

  usePartialErrorToast(partialError, error, !!data, () => queryClient.invalidateQueries({ queryKey: ["quotations", workspaceId] }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quotations", workspaceId] });
    // Accepting/deleting a quotation can change an event's contract value, which
    // affects the dashboard, events list, event details, and financial totals.
    invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "FinancialTransaction"]);
  };

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

  const clientNameFor = (qt) => clientsById[qt.client_id]?.name || parseSnapshot(qt.client_snapshot)?.name || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((qt) => {
      if (statusFilter !== "All" && qt.status !== statusFilter) return false;
      if (!q) return true;
      const ev = eventsById[qt.event_id];
      const hay = [qt.quotation_number, clientNameFor(qt), ev?.title || "", qt.status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [quotations, search, statusFilter, clientsById, eventsById]);

  const stats = useMemo(() => {
    const totalValue = quotations.reduce((s, q) => s + (Number(q.grand_total) || 0), 0);
    const draftCount = quotations.filter((q) => q.status === "draft").length;
    const finalizedCount = quotations.filter((q) => q.status === "finalized").length;
    const acceptedCount = quotations.filter((q) => q.status === "accepted").length;
    return { totalValue, draftCount, finalizedCount, acceptedCount };
  }, [quotations]);

  const onDelete = async (qt) => {
    if (!window.confirm(`${t("Delete quotation")} ${qt.quotation_number}? ${t("This cannot be undone.")}`)) return;
    try {
      await deleteQuotation(workspaceId, qt.id);
      toast({ title: t("Quotation deleted") });
      invalidate();
    } catch (e) {
      toast({ title: t("Delete failed"), description: e?.message, variant: "destructive" });
    }
  };

  const createInvoice = async (qt) => {
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const inv = await createFromQuotation(workspaceId, qt, items);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice created"), description: inv.invoice_number });
      navigate(`/invoices/${inv.id}`);
    } catch (e) {
      toast({ title: t("Failed to create invoice"), description: e?.message, variant: "destructive" });
    }
  };

  const onDuplicate = async (qt) => {
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const dup = await duplicateQuotation(workspaceId, qt, items);
      toast({ title: t("Quotation duplicated"), description: dup.quotation_number });
      invalidate();
      navigate(`/quotation/${dup.id}`);
    } catch (e) {
      toast({ title: t("Failed to duplicate"), description: e?.message, variant: "destructive" });
    }
  };

  const downloadPdf = async (qt) => {
    setGeneratingId(qt.id);
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const client = clientsById[qt.client_id] || parseSnapshot(qt.client_snapshot);
      const event = eventsById[qt.event_id];
      await generateQuotationPdf({ quotation: qt, items, workspace, client, event, currency });
    } catch (e) {
      toast({ title: t("PDF generation failed"), description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingId("");
    }
  };

  const previewPdf = async (qt) => {
    setGeneratingId(qt.id);
    setPreview({ url: "", filename: "", open: true, loading: true });
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const client = clientsById[qt.client_id] || parseSnapshot(qt.client_snapshot);
      const event = eventsById[qt.event_id];
      const result = await generateQuotationPdf({ quotation: qt, items, workspace, client, event, currency, returnBlob: true });
      setPreview({ url: result.url, filename: result.filename, open: true, loading: false });
    } catch (e) {
      toast({ title: t("Preview failed"), description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGeneratingId("");
    }
  };

  if (isLoading) return <QuotationPageSkeleton />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <PageHeader eyebrow={t("Sales")} title={t("Quotations")} subtitle={t("Create, track and finalize client quotations.")} />
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["quotations", workspaceId] })} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader eyebrow={t("Sales")} title={t("Quotations")} subtitle={t("Create, track and finalize client quotations.")}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return; exportQuotationsXlsx(filtered, clientsById, eventsById); }} disabled={filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4" /> {t("Export")}
          </Button>
          <Button onClick={() => navigate("/quotation/new")} className="max-lg:hidden">
            <Plus className="w-4 h-4" /> {t("Create Quotation")}
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("Total Quotations")} value={quotations.length} icon={FileText} tone="primary" />
        <StatCard label={t("Total Value")} value={stats.totalValue} format={(v) => formatMoney(v, currency)} icon={currencyIcon(currency)} tone="success" />
        <StatCard label={t("Accepted")} value={stats.acceptedCount} icon={CheckCircle2} tone="success" />
        <StatCard label={t("Pending")} value={stats.draftCount + stats.finalizedCount} icon={Pencil} tone="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t("Search by number, client,")} ${term.workItemSingular.toLowerCase()}…`}
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
          {QUOTATION_STATUSES.map((s) => <option key={s} value={s}>{t(QUOTATION_STATUS_META[s].label)}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={quotations.length === 0 ? t("No quotations created yet") : t("No quotations match your search")}
          description={quotations.length === 0 ? `${t("Create a quotation for your next")} ${term.workItemSingular.toLowerCase()}.` : t("Try a different search or filter.")}
          action={quotations.length === 0 ? <Button onClick={() => navigate("/quotation/new")}><Plus className="w-4 h-4" /> {t("Create Quotation")}</Button> : null}
        />
      ) : (
        <>
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {filtered.map((qt) => {
            const ev = eventsById[qt.event_id];
            return (
              <div key={qt.id} className="bg-card border border-border rounded-[15px] p-4 shadow-card cursor-pointer sm:hover:shadow-card-hover sm:hover:border-border/80 transition-shadow" onClick={() => navigate(`/quotation/${qt.id}`)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-medium text-foreground">{qt.quotation_number}</span>
                  <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", QUOTATION_STATUS_META[qt.status]?.className)}>
                    {QUOTATION_STATUS_META[qt.status]?.label ? t(QUOTATION_STATUS_META[qt.status].label) : qt.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-foreground">{clientNameFor(qt) || "—"}</div>
                <div className="text-xs text-muted-foreground">{ev?.title || "—"} · {fmtDate(qt.quotation_date)}</div>
                {qt.valid_until && <div className="text-xs text-muted-foreground mt-0.5">{t("Valid till")} {fmtDate(qt.valid_until)}</div>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{formatMoney(qt.grand_total, currency)}</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {qt.status === "accepted" && (
                      <button onClick={() => createInvoice(qt)} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-primary sm:hover:bg-primary/10 transition-colors" title={t("Create Invoice")}><Receipt className="w-4 h-4" /></button>
                    )}
                    {(qt.status === "finalized" || qt.status === "accepted") && (
                      <>
                        <button onClick={() => previewPdf(qt)} disabled={generatingId === qt.id} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors" title={t("Preview PDF")}><Eye className="w-4 h-4" /></button>
                        <button onClick={() => downloadPdf(qt)} disabled={generatingId === qt.id} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors" title={t("Download PDF")}><FileDown className="w-4 h-4" /></button>
                      </>
                    )}
                    <button onClick={() => onDuplicate(qt)} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors" title={t("Duplicate")}><Copy className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(qt)} className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-destructive transition-colors" title={t("Delete")}><Trash2 className="w-4 h-4" /></button>
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
                  <th className="text-left px-4 py-3 font-semibold">{t("Quotation No")}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t("Client")}</th>
                  <th className="text-left px-4 py-3 font-semibold">{term.workItemSingular}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t("Date")}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t("Valid Until")}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t("Total")}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t("Status")}</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((qt) => {
                  const ev = eventsById[qt.event_id];
                  return (
                    <tr
                      key={qt.id}
                      className="border-b border-border last:border-0 sm:hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/quotation/${qt.id}`)}
                    >
                      <td className="px-4 py-3.5 font-mono font-medium text-foreground">{qt.quotation_number}</td>
                      <td className="px-4 py-3.5 text-foreground">{clientNameFor(qt) || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[160px]">{ev?.title || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(qt.quotation_date)}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(qt.valid_until)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium tabular-nums text-foreground">{formatMoney(qt.grand_total, currency)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-[11px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide", QUOTATION_STATUS_META[qt.status]?.className)}>
                          {QUOTATION_STATUS_META[qt.status]?.label ? t(QUOTATION_STATUS_META[qt.status].label) : qt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {qt.status === "accepted" && (
                            <button
                              onClick={() => createInvoice(qt)}
                              className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-primary sm:hover:bg-primary/10 transition-colors"
                              title={t("Create Invoice")}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          {(qt.status === "finalized" || qt.status === "accepted") && (
                            <>
                              <button
                                onClick={() => previewPdf(qt)}
                                disabled={generatingId === qt.id}
                                className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors"
                                title={t("Preview PDF")}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadPdf(qt)}
                                disabled={generatingId === qt.id}
                                className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors"
                                title={t("Download PDF")}
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onDuplicate(qt)}
                            className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-primary transition-colors"
                            title={t("Duplicate")}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(qt)}
                            className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground sm:hover:bg-muted sm:hover:text-destructive transition-colors"
                            title={t("Delete")}
                          >
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

      <PdfPreviewModal
        url={preview.url}
        filename={preview.filename}
        open={preview.open}
        loading={preview.loading}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      />
      {FeatureGateDialog}
    </div>
  );
}