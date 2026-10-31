import { useState, useEffect, useRef } from "react";
import { useT } from "@/hooks/useT";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/utils/format";
import AnimatedMoney from "@/components/common/AnimatedMoney";
import { lineTotal, estimatorTotals, applyMarkupToItems, round2 } from "@/lib/quotationCalc";
import { loadServices } from "@/lib/quotationService";
import { loadRoles } from "@/lib/teamService";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import RetryState from "@/components/common/RetryState";
import RateEstimatorSkeleton from "@/components/estimator/RateEstimatorSkeleton";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import { usePartialErrorToast } from "@/hooks/usePartialErrorToast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RotateCcw, X, Plus, CalendarDays } from "lucide-react";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import { formatDateChip } from "@/lib/quotationCalc";
import DateRangeChips from "@/components/common/DateRangeChips";
import { openDatePicker } from "@/lib/openDatePicker";
import { todayISO, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useQuickAdd } from "@/components/common/QuickAdd";

export default function RateEstimator() {
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = workspace?.currency || "INR";
  const t = useT();
  usePageTitle("Rate Estimator");
  // Add a role/service without leaving the estimator; the query invalidation refreshes the chips.
  const { open: openQuickAdd, dialogs: quickAddDialogs } = useQuickAdd({
    // Show the new chip immediately; the invalidation refetch then confirms it.
    onChanged: (kind, saved) => {
      const field = kind === "role" ? "roles" : kind === "service" ? "services" : null;
      if (!field || !saved?.id) return;
      queryClient.setQueryData(["rate-estimator", workspaceId], (old) => {
        if (!old) return old;
        const list = old[field] || [];
        return { ...old, [field]: list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved] };
      });
    }
  });

  const [showPrices, setShowPrices] = useState(true);
  const [items, setItems] = useState([]);
  const [markup, setMarkup] = useState(20);
  // "common" = the whole estimate as before; "date" = items placed on particular days (item.day_date). Both can be mixed.
  const [view, setView] = useState("common");
  const [dates, setDates] = useState([]);
  const [activeDate, setActiveDate] = useState("");
  // Like the forms elsewhere in the app: one day, or several (a range whose days can be ticked off).
  const [dateMode, setDateMode] = useState("single");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const scope = view === "date" ? activeDate : "";

  // Remembered on this device, per workspace, so leaving the page doesn't lose the estimate.
  const storageKey = workspaceId ? `kramasha_estimator_${workspaceId}` : "";
  const restored = useRef("");
  useEffect(() => {
    if (!storageKey || restored.current === storageKey) return;
    restored.current = storageKey;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Array.isArray(saved.items)) {
        const d = Array.isArray(saved.dates) ? saved.dates.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort() : [];
        setItems(saved.items);
        setMarkup(Number.isFinite(saved.markup) ? saved.markup : 20);
        setDates(d);
        setActiveDate(d.includes(saved.activeDate) ? saved.activeDate : d[0] || "");
        setView(saved.view === "date" ? "date" : "common");
        setDateMode(saved.dateMode === "multi" ? "multi" : "single");
        setRangeStart(saved.rangeStart || "");
        setRangeEnd(saved.rangeEnd || "");
      }
    } catch { /* ignore */ }
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || restored.current !== storageKey) return;
    try {
      if (items.length === 0 && dates.length === 0 && markup === 20) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify({ items, markup, view, dates, activeDate, dateMode, rangeStart, rangeEnd }));
    } catch { /* ignore */ }
  }, [storageKey, items, markup, view, dates, activeDate, dateMode, rangeStart, rangeEnd]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rate-estimator", workspaceId],
    queryFn: async () => {
      const results = await staggeredAllSettled([
        () => loadServices(workspaceId),
        () => loadRoles(workspaceId)
      ]);
      const [svR, rlR] = results;
      const partialError = results.some((r) => r.status === "rejected");
      return {
        services: svR.status === "fulfilled" ? (svR.value || []) : [],
        roles: rlR.status === "fulfilled" ? (rlR.value || []) : [],
        partialError
      };
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev
  });

  const roles = data?.roles || [];
  const services = data?.services || [];
  const partialError = data?.partialError;

  usePartialErrorToast(partialError, error, !!data, () => queryClient.invalidateQueries({ queryKey: ["rate-estimator", workspaceId] }));

  const inScope = (it) => (view === "date" && !activeDate ? false : (it.day_date || "") === scope);
  const isLine = (it, type, refId) => it.type === type && it.reference_id === refId && inScope(it);
  const findItem = (type, refId) => items.find((it) => isLine(it, type, refId));
  const canPlace = view === "common" || !!activeDate;

  // Click chip: add (qty 1) or increment quantity if already selected.
  const clickRole = (r) => {
    setItems((prev) => {
      const existing = prev.find((it) => isLine(it, "role", r.id));
      if (existing) {
        return prev.map((it) =>
          isLine(it, "role", r.id) ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, {
        type: "role",
        item_type: "role",
        reference_id: r.id,
        name: r.name,
        quantity: 1,
        days: 1,
        unit_rate: r.default_rate || 0,
        rate_type: r.rate_type || "Per Event",
        gst_rate: 0,
        sac_code: "",
        day_date: scope
      }];
    });
  };

  const clickService = (s) => {
    setItems((prev) => {
      const existing = prev.find((it) => isLine(it, "service", s.id));
      if (existing) {
        return prev.map((it) =>
          isLine(it, "service", s.id) ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, {
        type: "service",
        item_type: "service",
        reference_id: s.id,
        name: s.name,
        quantity: 1,
        days: 1,
        unit_rate: s.default_rate || 0,
        rate_type: s.rate_type || "Fixed",
        gst_rate: s.gst_rate || 0,
        sac_code: s.sac_code || "",
        day_date: scope
      }];
    });
  };

  // x button: decrement quantity, remove when it reaches 0.
  const removeRole = (r) => {
    setItems((prev) => {
      const existing = prev.find((it) => isLine(it, "role", r.id));
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((it) => !isLine(it, "role", r.id));
      }
      return prev.map((it) =>
        isLine(it, "role", r.id) ? { ...it, quantity: it.quantity - 1 } : it
      );
    });
  };

  const removeService = (s) => {
    setItems((prev) => {
      const existing = prev.find((it) => isLine(it, "service", s.id));
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((it) => !isLine(it, "service", s.id));
      }
      return prev.map((it) =>
        isLine(it, "service", s.id) ? { ...it, quantity: it.quantity - 1 } : it
      );
    });
  };

  const teamItems = items.filter((it) => it.type === "role");
  const serviceItems = items.filter((it) => it.type === "service");
  const teamCost = round2(teamItems.reduce((s, it) => s + lineTotal(it), 0));
  const servicesCost = round2(serviceItems.reduce((s, it) => s + lineTotal(it), 0));
  const { markup: markupAmount, total } = estimatorTotals(items, markup);

  const dayCost = (d) => round2(items.filter((it) => (it.day_date || "") === d).reduce((sum, it) => sum + lineTotal(it), 0));
  const hasDated = items.some((it) => it.day_date);

  // Make "next" the days of this estimate. Items on a day that goes away are dropped (after asking).
  const setDatesTo = (next, { moveFrom = "" } = {}) => {
    const sorted = [...new Set(next)].sort();
    const gone = dates.filter((d) => !sorted.includes(d) && d !== moveFrom);
    if (items.some((it) => gone.includes(it.day_date)) && !window.confirm(t("Remove this date and its items?"))) return false;
    setItems((prev) => prev
      .filter((it) => !gone.includes(it.day_date))
      .map((it) => (moveFrom && it.day_date === moveFrom && sorted[0] ? { ...it, day_date: sorted[0] } : it)));
    setDates(sorted);
    setActiveDate(sorted.includes(activeDate) ? activeDate : sorted[0] || "");
    return true;
  };
  const removeDate = (d) => { setDatesTo(dates.filter((x) => x !== d)); };
  const switchDateMode = (mode) => {
    if (mode === dateMode) return;
    if (mode === "single") {
      if (!setDatesTo(dates.slice(0, 1))) return;
    } else if (dates.length) {
      setRangeStart(dates[0]);
      setRangeEnd(dates[dates.length - 1]);
    }
    setDateMode(mode);
  };

  const reset = () => {
    setItems([]);
    setMarkup(20);
    setDates([]);
    setActiveDate("");
    setView("common");
    setDateMode("single");
    setRangeStart("");
    setRangeEnd("");
  };

  const createQuotation = () => {
    if (items.length === 0) {
      toast({ title: t("Add at least one item to create a quotation.") });
      return;
    }
    const carried = applyMarkupToItems(items, markup).map((it) => ({
      item_type: it.item_type,
      reference_id: it.reference_id,
      name: it.name,
      description: it.description || "",
      quantity: it.quantity,
      days: it.days,
      unit_rate: it.unit_rate,
      rate_type: it.rate_type,
      gst_rate: it.gst_rate || 0,
      sac_code: it.sac_code || "",
      day_date: it.day_date || ""
    }));
    // Days with items go along too, so the quotation opens split by day.
    const usedDates = [...new Set(carried.map((it) => it.day_date).filter(Boolean))].sort();
    navigate("/quotation/new", { state: { estimateItems: carried, estimateDates: usedDates } });
  };

  if (isLoading) return <RateEstimatorSkeleton />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["rate-estimator", workspaceId] })} />
      </div>
    );
  }

  const RoleChip = ({ role }) => {
    const selected = !!findItem("role", role.id);
    const qty = findItem("role", role.id)?.quantity || 0;
    const rateLabel = formatMoney(role.default_rate || 0, currency);
    return (
      <div className="flex items-center">
        <button
          onClick={() => clickRole(role)}
          className={cn(
            "flex-1 flex items-center justify-between gap-2 px-4 py-2.5 rounded-full border text-sm transition-colors",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border text-foreground hover:bg-muted/50"
          )}
        >
          <span className="font-medium truncate">
            {selected && <span className="opacity-90">{qty} × </span>}
            {role.name}
          </span>
          {showPrices && (
            <span className={cn("text-xs whitespace-nowrap", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {rateLabel}
            </span>
          )}
        </button>
        {selected && (
          <button
            onClick={() => removeRole(role)}
            className="ml-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 shrink-0"
            aria-label={t("Remove")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const ServiceChip = ({ service }) => {
    const selected = !!findItem("service", service.id);
    const qty = findItem("service", service.id)?.quantity || 0;
    const rateLabel = formatMoney(service.default_rate || 0, currency);
    return (
      <div className="flex items-center">
        <button
          onClick={() => clickService(service)}
          className={cn(
            "flex-1 flex items-center justify-between gap-2 px-4 py-2.5 rounded-full border text-sm transition-colors",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border text-foreground hover:bg-muted/50"
          )}
        >
          <span className="font-medium truncate">
            {selected && <span className="opacity-90">{qty} × </span>}
            {service.name}
          </span>
          {showPrices && (
            <span className={cn("text-xs whitespace-nowrap", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {rateLabel}
            </span>
          )}
        </button>
        {selected && (
          <button
            onClick={() => removeService(service)}
            className="ml-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 shrink-0"
            aria-label={t("Remove")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t("Rate Estimator")}</h1>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="primary" onClick={createQuotation} disabled={items.length === 0}>
            <Plus className="w-3.5 h-3.5" />
            {t("New Entry")}
          </Button>
        </div>
      </div>

      {/* Display toggle bar */}
      <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t("Display rate on each chip")}</span>
        <Toggle checked={showPrices} onChange={setShowPrices} label={t("Display rate on each chip")} />
      </div>

      {/* Common estimate, or items placed on particular dates */}
      <div className="space-y-3">
        <SegmentedTabs
          size="sm"
          layoutId="estimator-view-toggle"
          items={[{ value: "common", label: t("Common") }, { value: "date", label: t("By date") }]}
          value={view}
          onChange={setView}
        />
        {view === "date" && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-3">
            <div className="inline-flex rounded-full border border-border bg-card p-0.5" role="group" aria-label={t("Single day or multiple days")}>
              {[["single", t("Single day")], ["multi", t("Multiple days")]].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={dateMode === v} onClick={() => switchDateMode(v)} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", dateMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
              ))}
            </div>
            {dateMode === "single" ? (
              <div className="relative w-full sm:w-56 h-9">
                <div className="absolute inset-0 flex items-center gap-2 px-3 bg-card border border-border rounded-lg text-base md:text-sm pointer-events-none">
                  <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={dates[0] ? "text-foreground" : "text-muted-foreground"}>{dates[0] ? formatDate(dates[0]) : t("Select a date")}</span>
                </div>
                <input
                  type="date"
                  aria-label={t("Select a date")}
                  value={dates[0] || ""}
                  min={todayISO()}
                  onChange={(e) => e.target.value && setDatesTo([e.target.value], { moveFrom: dates[0] || "" })}
                  onClick={openDatePicker}
                  className="date-overlay"
                />
              </div>
            ) : (
              <DateRangeChips
                startDate={rangeStart}
                endDate={rangeEnd}
                value={dates}
                onChange={(next) => setDatesTo(next)}
                onStartChange={setRangeStart}
                onEndChange={setRangeEnd}
                followStart
              />
            )}
            {dateMode === "multi" && dates.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {dates.map((d) => (
                  <button key={d} type="button" onClick={() => setActiveDate(d)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", d === activeDate ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-foreground")}>
                    {formatDateChip(d)}{showPrices && <span className="opacity-80"> · {formatMoney(dayCost(d), currency)}</span>}
                  </button>
                ))}
              </div>
            )}
            {dates.length === 0 && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{t("Pick the date first, then choose roles and services for it.")}</p>}
          </div>
        )}
      </div>

      {/* Selection panels */}
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", !canPlace && "opacity-50 pointer-events-none")}>
        <div className="bg-card border border-border rounded-[15px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{t("Team Roles")}</h3>
            <button type="button" onClick={() => openQuickAdd("role")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" />{t("Add role")}
            </button>
          </div>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t("No roles configured yet. Use Add role above.")}</p>
          ) : (
            <div className="space-y-2.5">
              {roles.map((r) => (
                <RoleChip key={r.id} role={r} />
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-[15px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{t("Services")}</h3>
            <button type="button" onClick={() => openQuickAdd("service")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" />{t("Add service")}
            </button>
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t("No services configured yet. Use Add service above.")}</p>
          ) : (
            <div className="space-y-2.5">
              {services.map((s) => (
                <ServiceChip key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* One card per date: what is planned that day and its total */}
      {view === "date" && dates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dates.map((d) => {
            const dayItems = items.filter((it) => it.day_date === d);
            return (
              <div
                key={d}
                role="button"
                tabIndex={0}
                onClick={() => setActiveDate(d)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveDate(d); }}
                className={cn("bg-card border rounded-[15px] p-4 cursor-pointer transition-colors", d === activeDate ? "border-primary" : "border-border hover:bg-muted/30")}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-primary" />{formatDateChip(d)}</h3>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeDate(d); }} aria-label={t("Remove")} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">{t("Nothing added for this day yet.")}</p>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    {dayItems.map((it) => (
                      <div key={`${it.type}-${it.reference_id}`} className="flex items-center justify-between gap-3">
                        <span className="text-foreground truncate">{it.quantity} × {it.name}</span>
                        <span className="text-muted-foreground whitespace-nowrap">{formatMoney(lineTotal(it), currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-sm">
                  <span className="font-medium text-muted-foreground">{t("Day total")}</span>
                  <span className="font-semibold text-foreground">{formatMoney(dayCost(d), currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profit margin */}
      <div className="bg-card border border-border rounded-[15px] p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("Profit Margin")}</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
          style={{ "--range-pct": `${markup}%` }}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-1.5">
          <span>{t("Markup")}</span>
          <span className="font-semibold text-foreground">{markup}%</span>
        </div>
      </div>

      {/* Estimate */}
      <div className="bg-card border border-border rounded-[15px] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("Estimate")}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
          <span className="text-muted-foreground">{t("Team Cost")}</span>
          <span className="text-right font-medium text-foreground"><AnimatedMoney value={teamCost} currency={currency} /></span>
          <span className="text-muted-foreground">{t("Services Cost")}</span>
          <span className="text-right font-medium text-foreground"><AnimatedMoney value={servicesCost} currency={currency} /></span>
          {hasDated && (
            <>
              <span className="text-muted-foreground">{t("Common")}</span>
              <span className="text-right text-foreground"><AnimatedMoney value={dayCost("")} currency={currency} /></span>
              {dates.map((d) => (
                <span key={d} className="contents">
                  <span className="text-muted-foreground">{formatDateChip(d)}</span>
                  <span className="text-right text-foreground"><AnimatedMoney value={dayCost(d)} currency={currency} /></span>
                </span>
              ))}
            </>
          )}
          <span className="text-muted-foreground">{t("Profit")} ({markup}%)</span>
          <span className="text-right font-medium text-success"><AnimatedMoney value={markupAmount} currency={currency} /></span>
          <span className="text-base font-semibold text-foreground pt-2 border-t border-border">{t("Total")}</span>
          <span className="text-right text-base font-bold text-foreground pt-2 border-t border-border"><AnimatedMoney value={total} currency={currency} /></span>
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button variant="reset" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
            {t("Reset")}
          </Button>
        </div>
      </div>
      {quickAddDialogs}
    </div>
  );
}
