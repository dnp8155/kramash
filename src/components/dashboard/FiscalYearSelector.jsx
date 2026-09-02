import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel } from "@/lib/financialYearService";

// Reusable Financial Year selector backed by workspace DB records.
// Uses the central useFinancialYear hook — selection persists across pages.
export default function FiscalYearSelector({ size = "md" }) {
  const { fiscalYears, selectedFY, selectFY, loading } = useFinancialYear();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3.5 text-sm"
  };

  if (loading || !fiscalYears.length) {
    return (
      <div className={`${sizeClasses[size]} flex items-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs`}>
        {loading ? "Loading…" : "No Financial Year available"}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 ${sizeClasses[size]} rounded-lg border border-border bg-card font-semibold text-foreground hover:bg-muted transition-colors shadow-xs`}
      >
        {fyDisplayLabel(selectedFY)}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden animate-fade-in max-h-72 overflow-y-auto scrollbar-thin">
          {fiscalYears.map((fy) => (
            <button
              key={fy.id}
              type="button"
              onClick={() => { selectFY(fy.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className="font-medium">{fyDisplayLabel(fy)}</span>
              {fy.id === selectedFY?.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}