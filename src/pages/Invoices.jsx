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
import { loadInvoices, deleteInvoice } from "@/lib/invoiceService";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Trash2, FileText, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";
import { invalidateEntities } from "@/lib/queryInvalidation";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const INVOICE_STATUSES = ["draft", "sent", "paid", "partial", "cancelled"];
const INVOICE_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  partial: { label: "Partial", className: "bg-badge-progress-bg text-badge-progress-fg" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" }
};

export default function Invoices() {
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: async () => {
      const [invs, cl, ev] = await Promise.all([
        loadInvoices(workspaceId),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
      ]);
      return { invoices: invs || [], clients: cl || [], events: ev || [] };
    },
    enabled: !!workspaceId
  });

  const invoices = data?.invoices || [];
  const clients = data?.clients || [];
  const events = data?.events || [];

  useEffect(() => {
    if (error) toast({ title: "Failed to load invoices", description: error?.message, variant: "destructive" });
  }, [error, toast]);

  const clientsById = useMemo(() => {
    const m = {};
    for (const c of clients) m[c.id] = c;
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (!q) return true;
      const cl = clientsById[inv.client_id];
      const hay = [inv.invoice_number, cl?.name || "", inv.status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [invoices, search, statusFilter, clientsById]);

  const stats = useMemo(() => {
    const totalValue = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
    const draftCount = invoices.filter((i) => i.status === "draft").length;
    const sentCount = invoices.filter((i) => i.status === "sent").length;
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    return { totalValue, draftCount, sentCount, paidCount };
  }, [invoices]);

  const onDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) return;
    try {
      await deleteInvoice(workspaceId, inv.id);
      toast({ title: "Invoice deleted" });
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
      <PageHeader eyebrow="Sales" title="Invoices" subtitle="Create and track client invoices.">
        <Button onClick={() => navigate("/invoices/new")}><Plus className="w-4 h-4" /> Create Invoice</Button>
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
      <PageHeader eyebrow="Sales" title="Invoices" subtitle="Create and track client invoices from approved quotations.">
        <Button onClick={() => navigate("/invoices/new")}><Plus className="w-4 h-4" /> Create Invoice</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Invoices" value={invoices.length} icon={FileText} tone="primary" />
        <StatCard label="Total Value" value={formatMoney(stats.totalValue, currency)} icon={IndianRupee} tone="success" />
        <StatCard label="Paid" value={stats.paidCount} icon={CheckCircle2} tone="success" />
        <StatCard label="Outstanding" value={stats.sentCount + stats.draftCount} icon={Clock} tone="muted" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, client…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="All">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{INVOICE_STATUS_META[s].label}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
          description={invoices.length === 0 ? "Create an invoice from an approved quotation or from scratch." : "Try a different search or filter."}
          action={invoices.length === 0 ? <Button onClick={() => navigate("/invoices/new")}><Plus className="w-4 h-4" /> Create Invoice</Button> : null}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((inv) => {
              const cl = clientsById[inv.client_id];
              return (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-medium text-foreground">{inv.invoice_number}</span>
                    <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", INVOICE_STATUS_META[inv.status]?.className)}>
                      {INVOICE_STATUS_META[inv.status]?.label || inv.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-foreground">{cl?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(inv.invoice_date)}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{formatMoney(inv.grand_total, currency)}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(inv); }} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-[0.08em] border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Invoice No</th>
                    <th className="text-left px-4 py-3 font-semibold">Client</th>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const cl = clientsById[inv.client_id];
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="px-4 py-3.5 font-mono font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="px-4 py-3.5 text-foreground">{cl?.name || "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium tabular-nums text-foreground">{formatMoney(inv.grand_total, currency)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn("text-[11px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide", INVOICE_STATUS_META[inv.status]?.className)}>
                            {INVOICE_STATUS_META[inv.status]?.label || inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => onDelete(inv)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
}