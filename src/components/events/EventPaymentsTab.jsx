import { useState, useRef, useMemo } from "react";
import { Pencil, Upload, Trash2, Ban, Wallet, Receipt, Loader2, Plus, Tag } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { voidTransaction, deleteTransaction } from "@/lib/financeService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import AddOnDialog from "@/components/events/AddOnDialog";
import TransactionShareCard from "@/components/events/TransactionShareCard";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { base44 } from "@/api/base44Client";

const OUT_COLOR = "#B24F3A";
const NAVY = "#2D4F75";

export default function EventPaymentsTab({
  event,
  transactions,
  membersById = {},
  client,
  assignments = [],
  currency = "INR",
  onAddClientPayment,
  onAddExpense,
  onRefresh,
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId, workspace } = useWorkspace();
  const prefs = useDisplayPreferences();
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [showAddOn, setShowAddOn] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState(null);
  const [shareTx, setShareTx] = useState(null);
  const shareCardRef = useRef(null);
  const shareBusyRef = useRef(false);

  const miscItems = useMemo(() => parseMiscExpenses(event?.misc_expenses_json), [event?.misc_expenses_json]);
  const miscTotal = miscExpensesTotal(miscItems);

  const removeAddOn = async (item) => {
    if (!confirm(`Remove add-on "${item.name}"?`)) return;
    try {
      const items = parseMiscExpenses(event?.misc_expenses_json).filter((it) => it.id !== item.id);
      await base44.entities.Event.update(event.id, { misc_expenses_json: JSON.stringify(items) });
      toast({ title: "Add-on removed" });
      onRefresh?.();
    } catch (e) {
      toast({ title: e?.message || "Failed to remove", variant: "destructive" });
    }
  };

  const activeTx = transactions.filter((t) => t.status === "ACTIVE");

  const particularFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return `Payment from ${client?.name || "Client"}`;
    }
    if (t.transaction_type === "TEAM_PAYMENT") {
      const m = membersById[t.team_member_id];
      const asg = assignments.find((a) => a.id === t.team_assignment_id);
      const role = asg?.role_name_snapshot || m?.profession || "Team";
      return `Payment to ${m?.name || "Team member"} (${role})`;
    }
    return t.expense_category_name_snapshot || t.notes || "Business Expense";
  };

  const typeLabel = (t) => (t.transaction_type === "CLIENT_RECEIPT" ? "Received" : "Paid");

  const handleDelete = async (t) => {
    if (!confirm("Delete this transaction? This will recalculate invoice and milestone balances.")) return;
    setVoiding(true);
    try {
      const res = await voidTransaction(workspaceId, t.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      toast({ title: "Transaction voided", description: "Invoice and milestone balances recalculated." });
      onRefresh?.();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message || "Failed to void transaction.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setVoiding(false);
    }
  };

  const handleHardDelete = async (t) => {
    if (!confirm("Permanently delete this transaction? This removes the record and recalculates invoice and milestone balances.")) return;
    setDeleting(true);
    try {
      const res = await deleteTransaction(workspaceId, t.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      toast({ title: "Transaction deleted", description: "Invoice and milestone balances recalculated." });
      onRefresh?.();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message || "Failed to delete transaction.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async (t) => {
    if (shareBusyRef.current) return;
    shareBusyRef.current = true;
    setShareTx(t);
    setSharingId(t.id);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = shareCardRef.current;
      if (!el) throw new Error("Share card not rendered");
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], `transaction-${t.id}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Transaction Receipt" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transaction-${t.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Image downloaded", description: "Share it via WhatsApp or any app." });
      }
    } catch (e) {
      const text =
        `${typeLabel(t)}: ${particularFor(t)}\n` +
        `Amount: ${formatMoney(t.amount, currency)}\n` +
        `Date: ${formatEventDate(t.transaction_date)}\n` +
        `Method: ${t.payment_method || "—"}` +
        (t.reference_number ? `\nRef: ${t.reference_number}` : "");
      navigator.clipboard?.writeText(text);
      toast({ title: "Copied to clipboard", description: "Image capture failed, text copied instead." });
    } finally {
      setSharingId(null);
      setShareTx(null);
      shareBusyRef.current = false;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">
          Transactions ({activeTx.length})
        </div>
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
          <Button size="sm" onClick={onAddClientPayment} className="justify-center sm:justify-start">
            <Wallet className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Client Payment</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditingAddOn(null); setShowAddOn(true); }} className="justify-center sm:justify-start">
            <Plus className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Add-on</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onAddExpense} className="justify-center sm:justify-start">
            <Receipt className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Expense</span>
          </Button>
        </div>
      </div>

      {miscItems.length > 0 && (
        <div className="bg-card border border-border rounded-[15px] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Add-ons</span>
              <span className="text-xs text-muted-foreground">({miscItems.length})</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-foreground">+{formatMoney(miscTotal, currency)}</div>
              <div className="text-[11px] text-muted-foreground">Added to contract</div>
            </div>
          </div>
          <div className="space-y-2">
            {miscItems.map((it) => (
              <div key={it.id || it.name} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-medium text-foreground truncate">{it.name || "Unnamed"}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(Number(it.amount) || 0, currency)}</div>
                  <button onClick={() => { setEditingAddOn(it); setShowAddOn(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit add-on">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeAddOn(it)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" aria-label="Remove add-on">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTx.length === 0 ? (
        <div className="bg-[#F5F5F5] border border-border rounded-[15px] p-5">
          <EmptyState title="No transactions yet" description="Record client payments or expenses for this entry." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeTx.map((t) => {
            const isOut = t.transaction_type !== "CLIENT_RECEIPT";
            return (
              <div
                key={t.id}
                className="bg-card border border-border rounded-[15px] p-4"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Date</div>
                    <div className="text-sm font-medium text-foreground">{formatEventDate(t.transaction_date)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Type</div>
                    <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>{typeLabel(t)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Amount</div>
                    <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>
                      {isOut ? "-" : "+"}{formatMoney(t.amount, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Method</div>
                    <div className="text-sm font-medium text-foreground">{t.payment_method || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] font-medium text-muted-foreground">Particular</div>
                    <div className="text-sm font-medium text-foreground break-anywhere">{particularFor(t)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    onClick={() => setEditing(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-foreground text-foreground text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleShare(t)}
                    disabled={sharingId === t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {sharingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Share Invoice
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={voiding}
                    className="ml-auto w-8 h-8 rounded-full flex items-center justify-center border border-foreground/30 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    aria-label="Void transaction"
                    title="Void"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleHardDelete(t)}
                    disabled={deleting}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    aria-label="Delete transaction"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditTransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); onRefresh?.(); }}
        transaction={editing}
        currency={currency}
      />

      <AddOnDialog
        open={showAddOn}
        onClose={() => { setShowAddOn(false); setEditingAddOn(null); }}
        onSaved={() => { setShowAddOn(false); setEditingAddOn(null); onRefresh?.(); }}
        event={event}
        currency={currency}
        editingItem={editingAddOn}
      />

      {shareTx && (
        <div
          style={{ position: "fixed", left: "-9999px", top: "0", zIndex: -1 }}
          ref={shareCardRef}
        >
          <TransactionShareCard
            transaction={shareTx}
            event={event}
            client={client}
            workspace={workspace}
            currency={currency}
            particularFor={particularFor}
            typeLabel={typeLabel}
            showLogo={prefs.showLogo}
          />
        </div>
      )}
    </div>
  );
}