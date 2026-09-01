import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { TRANSACTION_TYPES } from "@/constants/financeConfig";
import { Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// Transaction activity list — two-sided layout (matches reference):
// Left:  particular (bold) + entity · date (muted)
// Right: payment method (UPPERCASE) + amount (colored +/−)
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

  // Primary label for the row.
  const particularFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return eventsById[t.event_id]?.title || "Payment";
    }
    if (t.transaction_type === "TEAM_PAYMENT") {
      const m = membersById[t.team_member_id];
      const name = m?.name || "Team";
      const tag = m?.profession || m?.role_id || "";
      return tag ? `Payment to ${name} (${tag})` : `Payment to ${name}`;
    }
    if (t.transaction_type === "BUSINESS_EXPENSE") {
      return t.expense_category_name_snapshot || "Expense";
    }
    return "Transaction";
  };

  // Secondary line: associated entity · date.
  const secondaryFor = (t) => {
    let entity = "";
    if (t.transaction_type === "CLIENT_RECEIPT") {
      entity = clientsById[t.client_id]?.name || "";
    } else {
      const ev = eventsById[t.event_id];
      if (ev) entity = clientsById[ev.client_id]?.name || "";
      if (!entity && t.transaction_type === "BUSINESS_EXPENSE") {
        entity = t.expense_category_name_snapshot || "";
      }
      if (!entity) entity = "Misc";
    }
    const date = formatEventDate(t.transaction_date);
    return entity ? `${entity} · ${date}` : date;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {transactions.map((t) => {
        const meta = TRANSACTION_TYPES[t.transaction_type] || {};
        const isVoid = t.status === "VOID";
        const isIn = meta.direction === "in";

        return (
          <div
            key={t.id}
            className={cn(
              "group flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40",
              isVoid && "opacity-50"
            )}
          >
            {/* Left: particular + entity·date */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                {particularFor(t)}
                {isVoid && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-muted text-muted-foreground">
                    Void
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {secondaryFor(t)}
              </div>
            </div>

            {/* Right: method + amount + actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
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
                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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