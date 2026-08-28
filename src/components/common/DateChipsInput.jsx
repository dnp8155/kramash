import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, CalendarDays } from "lucide-react";

// Add individual (non-consecutive) dates as removable chips.
// value: array of "YYYY-MM-DD" strings (sorted ascending on add).
export default function DateChipsInput({ value = [], onChange, label = "Event Dates" }) {
  const [pending, setPending] = useState("");

  const addDate = () => {
    if (!pending) return;
    if (value.includes(pending)) {
      setPending("");
      return;
    }
    const next = [...value, pending].sort();
    onChange(next);
    setPending("");
  };

  const removeDate = (d) => {
    onChange(value.filter((x) => x !== d));
  };

  const fmt = (d) => {
    try {
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDate(); } }}
            className="w-full h-9 pl-10 pr-3 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <button
          type="button"
          onClick={addDate}
          disabled={!pending}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium"
            >
              {fmt(d)}
              <button
                type="button"
                onClick={() => removeDate(d)}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label="Remove date"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No dates added yet. Add dates one by one — they don't need to be consecutive.</p>
      )}
    </div>
  );
}