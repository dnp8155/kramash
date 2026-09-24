import { Plus, Trash2, Receipt } from "lucide-react";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";

export function parseMiscExpenses(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function miscExpensesTotal(items) {
  return (items || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
}

export default function EventMiscExpenseEditor({ items = [], onChange, currency = "INR" }) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const total = miscExpensesTotal(items);

  const addItem = () => {
    onChange([...items, { id: `me${Date.now()}`, name: "", amount: "", notes: "" }]);
  };

  const updateItem = (idx, patch) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" /> Misc Expenses
        </Label>
        <button type="button" onClick={addItem} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Expense
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Billable extras (travel, equipment, etc.) — added to the contract value.
      </p>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">No misc expenses. Add any extra billable cost.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id || idx} className="rounded-md border border-border bg-card p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <Input
                  value={it.name}
                  onChange={(e) => updateItem(idx, { name: e.target.value })}
                  placeholder="Expense name (e.g. Travel, Extra Album)"
                  className="flex-1"
                />
                <div className="w-28 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.amount}
                    onChange={(e) => updateItem(idx, { amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                value={it.notes}
                onChange={(e) => updateItem(idx, { notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={1}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted-foreground">Misc Expenses Total</span>
          <span className="font-semibold text-foreground tabular-nums">+{formatMoney(total, currency)}</span>
        </div>
      )}
    </div>
  );
}