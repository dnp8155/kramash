import { formatMoney } from "@/utils/format";
import { TRANSACTION_TYPES } from "@/constants/financeConfig";
import { Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// Transaction activity list — two-sided layout:
// Left: particular (party name) + client name
// Right: payment method + amount (colored +/− based on direction)
export default function PaymentTable({
  transactions = [],
  display = {},
  currency = "INR",
  onEdit,
  onVoid,
}) {
  const { eventsById = {}, clientsById = {}, membersById = {} } = display;

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
        No payment activity yet.
        <br />
        Recorded payments and expenses will appear here.
      </div>
    );
  }

  const particularFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return clientsById[t.client_id]?.name || "Client Payment";
    }
    if (t.transaction_type === "TEAM_PAYMENT") {
      return membersById[t.team_member_id]?.name || "Team Payment";
    }
    if (t.transaction_type === "BUSINESS_EXPENSE") {
      return t.expense_category_name_snapshot || "Expense";
    }
    return "Transaction";
  };

  const clientNameFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return clientsById[t.client_id]?.name || "";
    }
    const ev = eventsById[t.event_id];
    if (ev) return clientsById[ev.client_id]?.name || "";
    return "";
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {transactions.map((t) => {
        const meta = TRANSACTION_TYPES[t.transaction_type] || {};
        const isVoid = t.status === "VOID";
        const isIn = meta.direction === "in";
        const clientName = clientNameFor(t);

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40",
              isVoid && "opacity-50"
            )}
          >
            {/* Left: particular + client name */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                {particularFor(t)}
                {isVoid && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-muted text-muted-foreground">
                    Void
                  </span>
                )}
              </div>
              {clientName && (
                <div className="text-xs text-muted-foreground truncate">
                  {clientName}
                </div>
              )}
            </div>

            {/* Right: method + amount + actions */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {t.payment_method}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isIn ? "text-success" : "text-destructive"
                  )}
                >
                  {isIn ? "+" : "−"}
                  {formatMoney(t.amount, currency)}
                </div>
              </div>
              {!isVoid && (
                <div className="flex items-center gap-0.5">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(t)}
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label="Edit transaction"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onVoid && (
                    <button
                      onClick={() => onVoid(t)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Void transaction"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}