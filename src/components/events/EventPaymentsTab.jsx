import { useState, useRef } from "react";
import { Pencil, Upload, Trash2, Wallet, Receipt, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { voidTransaction } from "@/lib/financeService";
import { useWorkspace } from "@/lib/WorkspaceContext";
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
  const { workspaceId } = useWorkspace();
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const cardRefs = useRef({});

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

  const handleShare = async (t) => {
    const el = cardRefs.current[t.id];
    if (!el) return;
    setSharingId(t.id);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], `transaction-${t.id}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Transaction Receipt",
        });
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeTx.map((t) => {
            const isOut = t.transaction_type !== "CLIENT_RECEIPT";
            return (
              <div
                key={t.id}
                ref={(el) => (cardRefs.current[t.id] = el)}
                className="bg-white border border-border rounded-[15px] p-4"
              >
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
                    disabled={sharingId === t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {sharingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Share Invoice
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={voiding}
                    className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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