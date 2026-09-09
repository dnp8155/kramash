import {
  Pencil,
  Ban,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/utils/format";
import { transactionTypeLabels } from "@/constants/finance";
import { isMoneyIn, isMoneyOut, resolveTransactionFYId } from "@/utils/finance";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";

// Resolves the "party" (who money went to/from) for a transaction.
function partyLabel(t, { clients, members, categories }) {
  if (t.transaction_type === "CLIENT_RECEIPT") {
    return clients.find((c) => c.id === t.client_id)?.name || "—";
  }
  if (t.transaction_type === "TEAM_PAYMENT") {
    return members.find((m) => m.id === t.team_member_id)?.name || "—";
  }
  if (t.transaction_type === "BUSINESS_EXPENSE") {
    return categories.find((c) => c.id === t.expense_category_id)?.name || "Expense";
  }
  return "—";
}

export default function TransactionActivityTable({
  transactions = [],
  events = [],
  clients = [],
  members = [],
  categories = [],
  financialYears = [],
  onEdit,
  onVoid,
  onUnvoid,
}) {
  const eventMap = Object.fromEntries(events.map((e) => [e.id, e]));
  const fyMap = Object.fromEntries(financialYears.map((fy) => [fy.id, fy]));
  const ctx = { clients, members, categories };

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No payment activity yet"
        description="Recorded payments and expenses will appear here."
        icon={Wallet}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-semibold">Date</th>
            <th className="px-5 py-3 font-semibold">FY</th>
            <th className="px-5 py-3 font-semibold">Event</th>
            <th className="px-5 py-3 font-semibold">Type</th>
            <th className="px-5 py-3 font-semibold">Party</th>
            <th className="px-5 py-3 text-right font-semibold">Amount</th>
            <th className="px-5 py-3 font-semibold">Method</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => {
            const ev = eventMap[t.event_id];
            const moneyIn = isMoneyIn(t.transaction_type);
            const moneyOut = isMoneyOut(t.transaction_type);
            const voided = t.status === "VOID";
            return (
              <tr
                key={t.id}
                className={`transition-colors hover:bg-muted/30 ${voided ? "opacity-50" : ""}`}
              >
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                  {formatDate(t.transaction_date)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                  {fyMap[resolveTransactionFYId(t, financialYears)]?.name || "—"}
                </td>
                <td className="px-5 py-3 text-foreground">{ev?.title || "—"}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    {moneyIn ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                    ) : moneyOut ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
                    ) : null}
                    {transactionTypeLabels[t.transaction_type] || t.transaction_type}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {partyLabel(t, ctx)}
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                    voided
                      ? "text-muted-foreground line-through"
                      : moneyIn
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {moneyIn ? "+" : moneyOut ? "−" : ""}
                  {formatCurrency(t.amount)}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {t.payment_method || "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={voided ? "Void" : "Active"} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(t)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {voided ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUnvoid(t)}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onVoid(t)}
                        title="Void"
                      >
                        <Ban className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}