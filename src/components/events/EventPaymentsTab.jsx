import { useState } from "react";
import { Pencil, Upload, Trash2, Wallet, Receipt } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";

const OUT_COLOR = "#B24F3A";
const NAVY = "#2D4F75";
const RED = "#D9534F";

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
  const [editing, setEditing] = useState(null);

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
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await base44.entities.FinancialTransaction.delete(t.id);
      invalidateEntity(queryClient, "FinancialTransaction");
      toast({ title: "Transaction deleted" });
      onRefresh?.();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    }
  };

  const handleShare = async (t) => {
    const text =
      `${typeLabel(t)}: ${particularFor(t)}\n` +
      `Amount: ${formatMoney(t.amount, currency)}\n` +
      `Date: ${formatEventDate(t.transaction_date)}\n` +
      `Method: ${t.payment_method || "—"}` +
      (t.reference_number ? `\nRef: ${t.reference_number}` : "");
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with add actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">
          Transactions ({activeTx.length})
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onAddClientPayment}>
            <Wallet className="w-3.5 h-3.5" /> Client Payment
          </Button>
          <Button size="sm" variant="outline" onClick={onAddExpense}>
            <Receipt className="w-3.5 h-3.5" /> Expense
          </Button>
        </div>
      </div>

      {activeTx.length === 0 ? (
        <div className="bg-[#F5F5F5] border border-border rounded-[15px] p-5">
          <EmptyState title="No transactions yet" description="Record client payments or expenses for this entry." />
        </div>
      ) : (
        <div className="bg-[#F5F5F5] border border-border rounded-[15px] overflow-hidden">
          <div className="divide-y divide-[#D3D3D3]">
            {activeTx.map((t) => {
              const isOut = t.transaction_type !== "CLIENT_RECEIPT";
              return (
                <div key={t.id} className="p-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Date</div>
                      <div className="text-sm font-medium text-foreground">{formatEventDate(t.transaction_date)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Type</div>
                      <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>{typeLabel(t)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Amount</div>
                      <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>
                        {isOut ? "-" : "+"}{formatMoney(t.amount, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Method</div>
                      <div className="text-sm font-medium text-foreground">{t.payment_method || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Particular</div>
                      <div className="text-sm font-medium text-foreground break-anywhere">{particularFor(t)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3.5">
                    <button
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-foreground text-foreground text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleShare(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: NAVY }}
                    >
                      <Upload className="w-3.5 h-3.5" /> Share Invoice
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: RED }}
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EditTransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); onRefresh?.(); }}
        transaction={editing}
        currency={currency}
      />
    </div>
  );
}