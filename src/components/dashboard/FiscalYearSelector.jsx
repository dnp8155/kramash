import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { financialYearLabels } from "@/constants/financeConfig";

export default function FiscalYearSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const labels = financialYearLabels(5);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
      >
        {value}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden animate-fade-in">
          {labels.map((fy) => (
            <button
              key={fy}
              type="button"
              onClick={() => { onChange(fy); setOpen(false); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className="font-medium">{fy}</span>
              {fy === value && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}