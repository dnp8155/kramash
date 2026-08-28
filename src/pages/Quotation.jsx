import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { StatGridSkeleton, TableSkeleton } from "@/components/common/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/utils/format";
import { loadQuotations, deleteQuotation, loadQuotationItems } from "@/lib/quotationService";
import { QUOTATION_STATUSES, QUOTATION_STATUS_META } from "@/constants/quotationConfig";
import { generateQuotationPdf } from "@/lib/quotationPdf";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Trash2, FileDown, FileText, Eye } from "lucide-react";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import PageHeader from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Quotation() {
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const term = useBusinessTerminology();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [generatingId, setGeneratingId] = useState("");
  const [preview, setPreview] = useState({ url: "", filename: "", open: false, loading: false });
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["quotations", workspaceId],
    queryFn: async () => {
      const [qs, cl, ev] = await Promise.all([
        loadQuotations(workspaceId),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
      ]);
      return { quotations: qs || [], clients: cl || [], events: ev || [] };
    },
    enabled: !!workspaceId
  });
  const quotations = data?.quotations || [];
  const clients = data?.clients || [];
  const events = data?.events || [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["quotations", workspaceId] });

  useEffect(() => {
    if (error) toast({ title: "Failed to load quotations", description: error?.message, variant: "destructive" });
  }, [error, toast]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((qt) => {
      if (statusFilter !== "All" && qt.status !== statusFilter) return false;
      if (!q) return true;
      const cl = clientsById[qt.client_id];
      const ev = eventsById[qt.event_id];
      const hay = [qt.quotation_number, cl?.name || "", ev?.title || "", qt.status].join(" ").toLowerCase();
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
    if (!window.confirm(`Delete quotation ${qt.quotation_number}? This cannot be undone.`)) return;
    try {
      await deleteQuotation(workspaceId, qt.id);
      toast({ title: "Quotation deleted" });
      invalidate();
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  const downloadPdf = async (qt) => {
    setGeneratingId(qt.id);
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const client = clientsById[qt.client_id];
      const event = eventsById[qt.event_id];
      await generateQuotationPdf({ quotation: qt, items, workspace, client, event, currency });
    } catch (e) {
      toast({ title: "PDF generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingId("");
    }
  };

  const previewPdf = async (qt) => {
    setGeneratingId(qt.id);
    setPreview({ url: "", filename: "", open: true, loading: true });
    try {
      const items = await loadQuotationItems(workspaceId, qt.id);
      const client = clientsById[qt.client_id];
      const event = eventsById[qt.event_id];
      const result = await generateQuotationPdf({ quotation: qt, items, workspace, client, event, currency, returnBlob: true });
      setPreview({ url: result.url, filename: result.filename, open: true, loading: false });
    } catch (e) {
      toast({ title: "Preview failed", description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGeneratingId("");
    }
  };

  if (isLoading) return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
      <PageHeader title="Quotations" subtitle="Create, track and finalize client quotations.">
        <Button onClick={() => navigate("/quotation/new")}>
          <Plus className="w-4 h-4" /> Create Quotation
        </Button>
      </PageHeader>
      <StatGridSkeleton count={4} />
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 sm:w-44 rounded-md" />
      </div>
      <TableSkeleton />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
      <PageHeader title="Quotations" subtitle="Create, track and finalize client quotations.">
        <Button onClick={() => navigate("/quotation/new")}>
          <Plus className="w-4 h-4" /> Create Quotation
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Quotations</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{quotations.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Value</div>
          <div className="mt-1 text-xl font-bold text-foreground">{formatMoney(stats.totalValue, currency)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accepted</div>
          <div className="mt-1 text-2xl font-bold text-success">{stats.acceptedCount}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Drafts</div>
          <div className="mt-1 text-2xl font-bold text-muted-foreground">{stats.draftCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search by number, client, ${term.workItemSingular.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="All">All statuses</option>
          {QUOTATION_STATUSES.map((s) => <option key={s} value={s}>{QUOTATION_STATUS_META[s].label}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={quotations.length === 0 ? "No quotations created yet" : "No quotations match your search"}
          description={quotations.length === 0 ? `Create a quotation for your next ${term.workItemSingular.toLowerCase()}.` : "Try a different search or filter."}
          action={quotations.length === 0 ? <Button onClick={() => navigate("/quotation/new")}><Plus className="w-4 h-4" /> Create Quotation</Button> : null}
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Quotation No</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">{term.workItemSingular}</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((qt) => {
                  const cl = clientsById[qt.client_id];
                  const ev = eventsById[qt.event_id];
                  return (
                    <tr
                      key={qt.id}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/quotation/${qt.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{qt.quotation_number}</td>
                      <td className="px-4 py-3">{cl?.name || "—"}</td>
                      <td className="px-4 py-3">{ev?.title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(qt.quotation_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(qt.grand_total, currency)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", QUOTATION_STATUS_META[qt.status]?.className)}>
                          {QUOTATION_STATUS_META[qt.status]?.label || qt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          {(qt.status === "finalized" || qt.status === "accepted") && (
                            <>
                              <button
                                onClick={() => previewPdf(qt)}
                                disabled={generatingId === qt.id}
                                className="text-muted-foreground hover:text-primary p-1"
                                title="Preview PDF"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadPdf(qt)}
                                disabled={generatingId === qt.id}
                                className="text-muted-foreground hover:text-primary p-1"
                                title="Download PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onDelete(qt)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Delete"
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
      )}

      <PdfPreviewModal
        url={preview.url}
        filename={preview.filename}
        open={preview.open}
        loading={preview.loading}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}