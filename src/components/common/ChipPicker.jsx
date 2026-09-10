import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

// Reusable chip-based picker — replaces dropdowns with clickable chips.
// single mode: value is a string; clicking a chip selects it.
// multiple mode: value is an array; clicking a chip toggles membership.
//
// options: [{ value, label, color? }]
export default function ChipPicker({
  options = [],
  value,
  onChange,
  multiple = false,
  size = "md",
  className,
  emptyText = "No options available",
}) {
  const isSelected = (val) => (multiple ? (value || []).includes(val) : value === val);

  const toggle = (val) => {
    if (multiple) {
      const arr = value || [];
      onChange(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    } else {
      onChange(val === value ? "" : val);
    }
  };

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              selected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {selected && (multiple ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}