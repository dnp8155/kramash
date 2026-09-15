import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check, Calendar } from "lucide-react";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { buildDateRangePresets } from "@/lib/dateRangePresets";
import { scaleInVariants, EASE, DURATION_FAST } from "@/lib/motionVariants";

export default function FiscalYearSelector({ size = "md" }) {
  const { fiscalYears, activeFY, dateRange, selectDateRange, loading } = useFinancialYear();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const presets = useMemo(
    () => buildDateRangePresets(fiscalYears, activeFY),
    [fiscalYears, activeFY]
  );

  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3.5 text-sm",
  };

  const isPresetSelected = (preset) => {
    if (!dateRange) return false;
    if (dateRange.type !== preset.type) return false;
    if (dateRange.type === "fy") return dateRange.fyId === preset.fyId;
    if (dateRange.type === "all_time") return true;
    return dateRange.startDate === preset.startDate && dateRange.endDate === preset.endDate;
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;
    selectDateRange({
      type: "custom",
      label: `${customFrom} to ${customTo}`,
      startDate: customFrom,
      endDate: customTo,
    });
    setOpen(false);
  };

  if (loading || !fiscalYears.length) {
    return (
      <div className={`${sizeClasses[size]} flex items-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs`}>
        {loading ? "Loading…" : "No FY available"}
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
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{dateRange?.label || "Select range"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={scaleInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: DURATION_FAST, ease: EASE }}
            className="absolute left-0 lg:left-auto lg:right-0 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-lg z-[200] overflow-hidden origin-top lg:origin-top-right"
          >
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {presets.map((preset, idx) => {
                const selected = isPresetSelected(preset);
                return (
                  <button
                    key={`${preset.type}-${idx}`}
                    type="button"
                    onClick={() => {
                      selectDateRange(preset);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                      selected
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Range */}
            <div className="border-t border-border p-3 bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Custom Range
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full h-8 text-xs px-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full h-8 text-xs px-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customFrom || !customTo}
                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}