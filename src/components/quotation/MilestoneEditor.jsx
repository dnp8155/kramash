import { Plus, Trash2, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export default function MilestoneEditor({ milestones, grandTotal, onChange }) {
  const list = Array.isArray(milestones) ? milestones : [];

  const update = (idx, field, value) => {
    const next = [...list];
    next[idx] = { ...next[idx], [field]: value };
    if (field === "percentage") {
      const pct = Math.max(0, Math.min(100, Number(value) || 0));
      next[idx].amount = Math.round((pct / 100) * (grandTotal || 0));
    }
    onChange(next);
  };

  const add = () => {
    const usedPct = list.reduce((s, m) => s + (Number(m.percentage) || 0), 0);
    const remaining = Math.max(0, 100 - usedPct);
    const amount = Math.round((remaining / 100) * (grandTotal || 0));
    onChange([...list, { label: "", percentage: remaining, amount }]);
  };

  const remove = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  const totalAmount = list.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const totalPct = list.reduce((s, m) => s + (Number(m.percentage) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Payment Milestones</span>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Add Milestone
        </button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          No milestones configured. Add payment milestones to show a schedule on the client quotation.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2.5">
              <input
                type="number"
                value={m.percentage ?? ""}
                onChange={(e) => update(idx, "percentage", Number(e.target.value) || 0)}
                min="0"
                max="100"
                className="h-9 w-16 shrink-0 rounded-md border border-input bg-card px-2 text-center text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="%"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <input
                type="text"
                value={m.label || ""}
                onChange={(e) => update(idx, "label", e.target.value)}
                placeholder="e.g. Advance on Signing"
                className="h-9 flex-1 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                value={m.amount ?? ""}
                onChange={(e) => update(idx, "amount", Number(e.target.value) || 0)}
                className="h-9 w-28 shrink-0 rounded-md border border-input bg-card px-2 text-right text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                placeholder="Amount"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground">
              Total: {totalPct}% · {formatCurrency(totalAmount)}
            </span>
            {grandTotal > 0 && totalAmount !== Math.round(grandTotal) && (
              <span className="font-medium text-amber-600">
                Differs from grand total ({formatCurrency(grandTotal)})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}