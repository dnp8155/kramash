import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import SearchInput from "@/components/common/SearchInput";
import InvoiceStatusBadge from "@/components/invoice/InvoiceStatusBadge";
import { Plus, Eye, Pencil, Download, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import { generateInvoicePDF } from "@/utils/invoicePdf";

export default function Invoices() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfLoading, setPdfLoading] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      setLoading(true);
      try {
        const [invList, clientList] = await Promise.all([
          base44.entities.Invoice.filter({ workspace_id: workspaceId }, "-issue_date", 500),
          base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        ]);
        setInvoices(invList || []);
        setClients(clientList || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  const clientName = (clientId) => clients.find((c) => c.id === clientId)?.name || "—";

  const filtered = useMemo(() => {
    return (invoices || []).filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cn = clientName(inv.client_id).toLowerCase();
        if (!inv.invoice_number?.toLowerCase().includes(q) && !cn.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter, clients]);

  const handlePDF = async (inv) => {
    setPdfLoading(inv.id);
    try {
      const ws = await base44.entities.Workspace.get(inv.workspace_id);
      await generateInvoicePDF({ invoice: inv, workspace: ws });
    } catch {} finally {
      setPdfLoading(null);
    }
  };

  if (loading) return <LoadingState label="Loading invoices…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create, track, and manage client invoices"
        actions={
          <Button onClick={() => navigate("/invoices/new")}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice # or client…" className="flex-1" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Due">Due</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Create your first invoice to start tracking payments."
          action={<Button onClick={() => navigate("/invoices/new")}><Plus className="h-4 w-4" /> New Invoice</Button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Milestone</th>
                  <th className="px-4 py-3 font-semibold">Issue Date</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{clientName(inv.client_id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.milestone_tag || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(inv.total_amount || 0)}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(inv.balance_due || 0)}</td>
                    <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {inv.status === "Draft" && (
                          <button onClick={() => navigate(`/invoices/${inv.id}/edit`)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handlePDF(inv)} disabled={pdfLoading === inv.id} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="PDF">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((inv) => (
              <Card key={inv.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{clientName(inv.client_id)}</p>
                    {inv.milestone_tag && <p className="text-xs text-muted-foreground">{inv.milestone_tag}</p>}
                  </div>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Issued {formatDate(inv.issue_date)}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(inv.total_amount || 0)}</span>
                </div>
                {(inv.balance_due || 0) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Balance: {formatCurrency(inv.balance_due)}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePDF(inv)} disabled={pdfLoading === inv.id}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}