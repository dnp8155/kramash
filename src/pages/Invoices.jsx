import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import EmptyState from "@/components/common/EmptyState";
import InvoiceEditor from "@/components/invoices/InvoiceEditor";
import { INVOICE_STATUS, statusLabel, parseJson, deleteInvoice, generateInvoiceNumber } from "@/lib/invoiceService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const STATUS_CLASS = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground line-through"
};

export default function Invoices() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: () => base44.entities.Invoice.filter({ workspace_id: workspaceId }, "-created_date"),
    enabled: !!workspaceId
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", workspaceId],
    queryFn: () => base44.entities.Client.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", workspaceId],
    queryFn: () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date"),
    enabled: !!workspaceId
  });

  const clientsById = clients.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      (clientsById[inv.client_id]?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: invoices.length,
    outstanding: invoices
      .filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status))
      .reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length
  };

  const refresh = () => invalidateEntities(queryClient, ["Invoice"]);

  const handleNew = () => {
    const number = generateInvoiceNumber(invoices);
    setEditingInvoice({
      invoice_number: number,
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
      items_json: "[]",
      subtotal: 0,
      discount_amount: 0,
      gst_applicable: false,
      gst_amount: 0,
      grand_total: 0,
      amount_paid: 0,
      balance_due: 0
    });
    setShowEditor(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice(deleteTarget.id);
      toast({ title: "Invoice deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        subtitle="Create invoices from accepted quotes, track payments and balances."
      >
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={stats.total} icon={FileText} tone="primary" />
        <StatCard label="Outstanding" value={`₹${(stats.outstanding / 100000).toFixed(1)}L`} icon={AlertCircle} tone="warning" />
        <StatCard label="Paid" value={stats.paid} icon={CheckCircle2} tone="success" />
        <StatCard label="Overdue" value={stats.overdue} icon={TrendingUp} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="w-56" />
        <select
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          {INVOICE_STATUS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading invoices...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState title="No invoices found" description="Create a new invoice or convert an accepted quotation." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Invoice #</span>
            <span>Client</span>
            <span>Date</span>
            <span>Status</span>
            <span>Balance</span>
            <span />
          </div>
          {filtered.map((inv) => {
            const client = clientsById[inv.client_id];
            const items = parseJson(inv.items_json);
            return (
              <div
                key={inv.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => { setEditingInvoice(inv); setShowEditor(true); }}
              >
                <div className="text-sm font-semibold text-foreground">{inv.invoice_number}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{client?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{items.length} items</div>
                </div>
                <div className="text-sm text-muted-foreground hidden md:block">
                  {new Date(inv.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
                <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit", STATUS_CLASS[inv.status])}>
                  {statusLabel(inv.status)}
                </span>
                <div className="text-sm">
                  <div className="font-semibold text-foreground tabular-nums">₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}</div>
                  {Number(inv.balance_due) > 0 && inv.status !== "paid" && (
                    <div className="text-xs text-warning tabular-nums">Due: ₹{Number(inv.balance_due).toLocaleString("en-IN")}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => { setEditingInvoice(inv); setShowEditor(true); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(inv)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InvoiceEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSaved={refresh}
        invoice={editingInvoice}
        workspaceId={workspaceId}
        clients={clients}
        events={events}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.invoice_number}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}