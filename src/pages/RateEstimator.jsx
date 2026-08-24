import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/utils/format";
import { lineTotal, estimatorTotals, applyMarkupToItems, round2 } from "@/lib/quotationCalc";
import { loadServices } from "@/lib/quotationService";
import { loadRoles } from "@/lib/teamService";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import LoadingState from "@/components/common/LoadingState";
import { RotateCcw, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RateEstimator() {
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";

  const [showPrices, setShowPrices] = useState(true);
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [markup, setMarkup] = useState(20);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [sv, rl] = await Promise.all([
        loadServices(workspaceId),
        loadRoles(workspaceId)
      ]);
      setServices(sv || []);
      setRoles(rl || []);
    } catch (e) {
      toast({ title: "Failed to load rates", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => { load(); }, [load]);

  const findItem = (type, refId) => items.find((it) => it.type === type && it.reference_id === refId);

  // Click chip: add (qty 1) or increment quantity if already selected.
  const clickRole = (r) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.type === "role" && it.reference_id === r.id);
      if (existing) {
        return prev.map((it) =>
          it.type === "role" && it.reference_id === r.id ? { ...it, quantity: it.quantity + 1 } : it
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
        sac_code: ""
      }];
    });
  };

  const clickService = (s) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.type === "service" && it.reference_id === s.id);
      if (existing) {
        return prev.map((it) =>
          it.type === "service" && it.reference_id === s.id ? { ...it, quantity: it.quantity + 1 } : it
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
        sac_code: s.sac_code || ""
      }];
    });
  };

  // x button: decrement quantity, remove when it reaches 0.
  const removeRole = (r) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.type === "role" && it.reference_id === r.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((it) => !(it.type === "role" && it.reference_id === r.id));
      }
      return prev.map((it) =>
        it.type === "role" && it.reference_id === r.id ? { ...it, quantity: it.quantity - 1 } : it
      );
    });
  };

  const removeService = (s) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.type === "service" && it.reference_id === s.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((it) => !(it.type === "service" && it.reference_id === s.id));
      }
      return prev.map((it) =>
        it.type === "service" && it.reference_id === s.id ? { ...it, quantity: it.quantity - 1 } : it
      );
    });
  };

  const teamItems = items.filter((it) => it.type === "role");
  const serviceItems = items.filter((it) => it.type === "service");
  const teamCost = round2(teamItems.reduce((s, it) => s + lineTotal(it), 0));
  const servicesCost = round2(serviceItems.reduce((s, it) => s + lineTotal(it), 0));
  const { cost: subtotal, markup: markupAmount, total } = estimatorTotals(items, markup);

  const reset = () => {
    setItems([]);
    setMarkup(20);
  };

  const createQuotation = () => {
    if (items.length === 0) {
      toast({ title: "Add at least one item to create a quotation." });
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
      sac_code: it.sac_code || ""
    }));
    navigate("/quotation/new", { state: { estimateItems: carried } });
  };

  if (loading) return <LoadingState label="Loading rates…" />;

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
            aria-label="Remove"
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
            aria-label="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Rate Estimator</h1>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success" />
            Online
          </span>
          <Button variant="dark" onClick={createQuotation} disabled={items.length === 0}>
            <Plus className="w-4 h-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Display toggle bar */}
      <div className="bg-card border border-border rounded-full px-5 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Display rate on each chip</span>
        <Toggle checked={showPrices} onChange={setShowPrices} label="Display rate on each chip" />
      </div>

      {/* Selection panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Team Roles</h3>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No roles configured. Add them in Preferences.</p>
          ) : (
            <div className="space-y-2.5">
              {roles.map((r) => (
                <RoleChip key={r.id} role={r} />
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Services</h3>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No services configured. Add them in Preferences.</p>
          ) : (
            <div className="space-y-2.5">
              {services.map((s) => (
                <ServiceChip key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profit margin */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Profit Margin</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-1.5">
          <span>Markup</span>
          <span className="font-semibold text-foreground">{markup}%</span>
        </div>
      </div>

      {/* Estimate + Reset */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="flex sm:flex-col gap-2 sm:justify-end">
          <Button variant="destructive" onClick={reset} className="sm:mb-1">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Estimate</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
            <span className="text-muted-foreground">Team Cost</span>
            <span className="text-right font-medium text-foreground">{formatMoney(teamCost, currency)}</span>
            <span className="text-muted-foreground">Services Cost</span>
            <span className="text-right font-medium text-foreground">{formatMoney(servicesCost, currency)}</span>
            <span className="text-muted-foreground">Profit ({markup}%)</span>
            <span className="text-right font-medium text-success">{formatMoney(markupAmount, currency)}</span>
            <span className="text-base font-semibold text-foreground pt-2 border-t border-border">Total</span>
            <span className="text-right text-base font-bold text-foreground pt-2 border-t border-border">{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}