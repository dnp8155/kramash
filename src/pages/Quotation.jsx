import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Eye, Download, Loader2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useQuotations } from "@/hooks/useQuotations";
import { useClients } from "@/hooks/useClients";
import { useEvents } from "@/hooks/useEvents";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/lib/PlanContext";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/utils/format";
import { generateQuotationPDF } from "@/utils/quotationPdf";

const QUOTATION_STATUSES = ["Draft", "Finalized", "Accepted", "Rejected"];

export default function Quotation() {
  const navigate = useNavigate();
  const { currentWorkspace, workspaceId } = useWorkspace();
  const { canUseFeature } = usePlan();
  const { quotations, loading, error, refetch } = useQuotations();
  const { clients } = useClients();
  const { events } = useEvents();
  const t = useBusinessTerminology();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const clientName = (id) => clients.find((c) => c.id === id)?.name || "—";
  const eventTitle = (id) => events.find((e) => e.id === id)?.title || "—";

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        !search ||
        [q.quotation_number, clientName(q.client_id), eventTitle(q.event_id)]
          .some((f) => f.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter, clients, events]);

  const handleQuickPDF = async (q) => {
    if (!canUseFeature("pdf_export_enabled")) {
      toast({ title: "PDF export is a Pro feature", description: "Upgrade to Kramashah Pro to export branded PDFs.", variant: "destructive" });
      return;
    }
    setPdfLoadingId(q.id);
    try {
      const qItems = await base44.entities.QuotationItem.filter(
        { workspace_id: workspaceId, quotation_id: q.id },
        "sort_order", 500
      );
      const client = clients.find((c) => c.id === q.client_id);
      const event = q.event_id ? events.find((e) => e.id === q.event_id) : null;
      await generateQuotationPDF({
        quotation: q,
        items: qItems || [],
        workspace: currentWorkspace,
        client,
        event,
        terminology: t,
      });
    } catch (e) {
      toast({ title: "PDF failed", description: e?.message, variant: "destructive" });
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading quotations…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quotation & Agreement"
        description="Create, send, and track quotations and signed agreements."
        actions={
          <Button onClick={() => navigate("/quotation/new")}>
            <Plus className="h-4 w-4" /> New Quotation
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search by quotation #, client, ${t.workItemSingular.toLowerCase()}…`}
            className="flex-1"
          />
          <FilterControl
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={QUOTATION_STATUSES}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quotations</CardTitle></CardHeader>
        {filtered.length === 0 ? (
          <EmptyState
            title="No quotations created yet"
            description={`Create a quotation for your next ${t.workItemSingular.toLowerCase()}.`}
            icon={FileText}
            action={
              <Button onClick={() => navigate("/quotation/new")}>
                <Plus className="h-4 w-4" /> New Quotation
              </Button>
            }
          />
        ) : (
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Quotation #</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">{t.workItemSingular}</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((q) => (
                    <tr
                      key={q.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/quotation/${q.id}`)}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{q.quotation_number}</td>
                      <td className="px-5 py-3 text-foreground">{clientName(q.client_id)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{eventTitle(q.event_id)}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(q.grand_total)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(q.quotation_date)}</td>
                      <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="View"
                            onClick={() => navigate(`/quotation/${q.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label="Download PDF"
                            disabled={pdfLoadingId === q.id}
                            onClick={() => handleQuickPDF(q)}
                          >
                            {pdfLoadingId === q.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}