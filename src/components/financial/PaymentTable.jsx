import { formatMoney } from "@/utils/format";
import { TRANSACTION_TYPES } from "@/constants/financeConfig";
import { Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// Real transaction activity list. Preserves the existing 4-column grid layout
// and adds a type badge + edit/void actions.
// `display` = { eventsById, clientsById, membersById }
export default function PaymentTable({
  transactions = [],
  display = {},
  currency = "INR",
  onEdit,
  onVoid
}) {
  const { eventsById = {}, clientsById = {}, membersById = {} } = display;

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
        No payment activity yet.
        <br />Recorded payments and expenses will appear here.
      </div>
    );
  }

  const partyFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return clientsById[t.client_id]?.name || "Client";
    }
    if (t.transaction_type === "TEAM_PAYMENT") {
      return membersById[t.team_member_id]?.name || "Team member";
    }
    if (t.transaction_type === "BUSINESS_EXPENSE") {
      return t.expense_category_name_snapshot || "Expense";
    }
    return "—";
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Description</span>
        <span>Date</span>
        <span>Source</span>
        <span className="text-right">Amount</span>
        <span></span>
      </div>
      {transactions.map((t) => {
        const ev = eventsById[t.event_id];
        const meta = TRANSACTION_TYPES[t.transaction_type] || {};
        const isVoid = t.status === "VOID";
        const isIn = meta.direction === "in";
        return (
          <div
            key={t.id}
            className={cn(
              "grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 sm:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40",
              isVoid && "opacity-50"
            )}
          >
            <div className="min-w-0 col-span-2 sm:col-span-1">
              <div className="text-sm font-medium text-foreground truncate flex items-center gap-2 flex-wrap">
                {ev?.title || "Event"}
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
                  isIn ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {meta.label || t.transaction_type}
                </span>
                {isVoid && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-muted text-muted-foreground">
                    Void
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {partyFor(t)}{t.reference_number ? ` · Ref ${t.reference_number}` : ""}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="sm:hidden text-xs text-muted-foreground/70 mr-1">Date:</span>
              {t.transaction_date}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="sm:hidden text-xs text-muted-foreground/70 mr-1">Method:</span>
              {t.payment_method}
            </div>
            <div className={cn(
              "text-sm font-semibold sm:text-right",
              isIn ? "text-success" : "text-destructive"
            )}>
              {isIn ? "+" : "−"}{formatMoney(t.amount, currency)}
            </div>
            <div className="flex items-center gap-1 sm:justify-end col-span-2 sm:col-span-1 justify-end">
              {!isVoid && onEdit && (
                <button
                  onClick={() => onEdit(t)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Edit transaction"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {!isVoid && onVoid && (
                <button
                  onClick={() => onVoid(t)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Void transaction"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}