import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { TRANSACTION_TYPES } from "@/constants/financeConfig";
import { Pencil, Ban, Trash2, Upload, CircleEllipsis } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function PaymentTable({
  transactions = [],
  display = {},
  currency = "INR",
  onEdit,
  onVoid,
  onDelete,
  onShare,
}) {
  const { eventsById = {}, clientsById = {}, membersById = {} } = display;

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[15px] p-10 text-center text-sm text-muted-foreground">
        No payment activity yet.
        <br />
        Recorded payments and expenses will appear here.
      </div>
    );
  }

  const particularFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      return eventsById[t.event_id]?.title || t.expense_category_name_snapshot || "Payment";
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

  const clientNameFor = (t) => {
    if (t.transaction_type === "CLIENT_RECEIPT") {
      if (!t.event_id && !t.client_id) return "Misc Income";
      return clientsById[t.client_id]?.name || "";
    }
    if (t.transaction_type === "BUSINESS_EXPENSE") {
      return "Misc Expense";
    }
    const ev = eventsById[t.event_id];
    if (ev) return clientsById[ev.client_id]?.name || "";
    return "";
  };

  return (
    <div className="bg-card border border-border rounded-[15px] overflow-hidden">
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
            <div className="min-w-0 flex-1">
              {/* Text sits in its own truncating span: a bare text node inside a flex container is clipped without an ellipsis. */}
              <div className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                <span className="truncate min-w-0">{particularFor(t)}</span>
                {isVoid && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-muted text-muted-foreground">
                    Void
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-foreground/70 truncate min-w-0">{clientNameFor(t)}</span>
                <span className="text-muted-foreground/60 shrink-0">·</span>
                <span className="shrink-0 whitespace-nowrap">{formatEventDate(t.transaction_date)}</span>
              </div>
            </div>

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
                <>
                  <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onShare && (
                      <button onClick={() => onShare(t)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors" aria-label="Share invoice">
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onEdit && (
                      <button onClick={() => onEdit(t)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors" aria-label="Edit transaction">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onVoid && (
                      <button onClick={() => onVoid(t)} className="text-muted-foreground hover:text-destructive p-1 rounded-full hover:bg-destructive/5 transition-colors" aria-label="Void transaction">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(t)} className="text-muted-foreground hover:text-destructive p-1 rounded-full hover:bg-destructive/5 transition-colors" aria-label="Delete transaction">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="More actions">
                          <CircleEllipsis className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-[15px] p-1.5 min-w-[11rem]">
                        {onShare && <DropdownMenuItem className="rounded-[10px] py-2" onClick={() => onShare(t)}><Upload className="w-4 h-4 mr-2" /> Share Invoice</DropdownMenuItem>}
                        {onEdit && <DropdownMenuItem className="rounded-[10px] py-2" onClick={() => onEdit(t)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>}
                        {onVoid && <DropdownMenuItem className="rounded-[10px] py-2" onClick={() => onVoid(t)}><Ban className="w-4 h-4 mr-2" /> Void</DropdownMenuItem>}
                        {onDelete && <DropdownMenuItem className="rounded-[10px] py-2 text-destructive focus:text-destructive" onClick={() => onDelete(t)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}