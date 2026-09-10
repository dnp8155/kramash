import { Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export default function QuotationMilestoneSection({ quotation }) {
  const milestones = quotation.milestones || [];
  if (milestones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment Milestones</h3>
      </div>
      <div className="mt-4 space-y-2">
        {milestones.map((m, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              {m.percentage != null && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {m.percentage}%
                </span>
              )}
              <span className="text-sm font-medium text-foreground">{m.label || `Milestone ${idx + 1}`}</span>
            </div>
            {m.amount != null && (
              <span className="text-sm font-bold text-foreground">{formatCurrency(m.amount)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}