import { format, parseISO } from "date-fns";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

function fyStatus(fy) {
  if (fy.is_active) return "Active";
  const today = new Date().toISOString().slice(0, 10);
  if (fy.end_date < today) return "Closed";
  if (fy.start_date > today) return "Upcoming";
  return "Current";
}

const statusStyles = {
  Active: "text-success font-semibold",
  Closed: "text-muted-foreground",
  Upcoming: "text-primary font-medium",
  Current: "text-warning font-medium"
};

export default function FinancialYearCard({
  fy,
  summary = { received: 0, paid: 0, profit: 0 },
  currency = "INR",
  onSetActive,
  onEdit,
  onDelete
}) {
  const status = fyStatus(fy);
  const isActive = fy.is_active;

  return (
    <div
      className={cn(
        "bg-card rounded-lg p-4 transition-all",
        isActive ? "border-2 border-success" : "border border-border hover:border-border/80"
      )}
    >
      {/* Key-value grid */}
      <div className="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-sm">
        <div className="text-muted-foreground">ID</div>
        <div className="text-foreground text-right font-medium">{fy.fy_id}</div>

        <div className="text-muted-foreground">Label</div>
        <div className="text-foreground text-right">{fy.label}</div>

        <div className="text-muted-foreground">Start</div>
        <div className="text-foreground text-right">
          {format(parseISO(fy.start_date), "dd MMM yyyy")}
        </div>

        <div className="text-muted-foreground">End</div>
        <div className="text-foreground text-right">
          {format(parseISO(fy.end_date), "dd MMM yyyy")}
        </div>

        <div className="text-muted-foreground">Status</div>
        <div className={cn("text-right", statusStyles[status])}>{status}</div>
      </div>

      {/* Summaries */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Received</div>
          <div className="text-sm font-semibold text-success tabular-nums">
            {formatMoney(summary.received, currency)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Paid</div>
          <div className="text-sm font-semibold text-destructive tabular-nums">
            {formatMoney(summary.paid, currency)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Profit</div>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              summary.profit >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatMoney(summary.profit, currency)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        {!isActive && onSetActive && (
          <button
            onClick={() => onSetActive(fy)}
            className="px-3 py-1.5 text-xs font-medium bg-success text-white rounded-full hover:opacity-90 transition-opacity"
          >
            Set Active
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(fy)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-border text-foreground rounded-full hover:bg-muted flex items-center gap-1.5 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(fy)}
            className="ml-auto w-7 h-7 flex items-center justify-center text-white bg-destructive rounded-full hover:opacity-90 transition-opacity"
            aria-label="Delete financial year"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}