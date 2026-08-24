import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/utils/format";
import { lineTotal, estimatorTotals, applyMarkupToItems, round2 } from "@/lib/quotationCalc";
import { loadServices } from "@/lib/quotationService";
import { loadRoles } from "@/lib/teamService";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { RotateCcw, Check, FileText, Trash2 } from "lucide-react";
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

  const isSelected = (type, refId) => items.some((it) => it.type === type && it.reference_id === refId);

  const toggleRole = (r) => {
    setItems((prev) => {
      if (prev.some((it) => it.type === "role" && it.reference_id === r.id)) {
        return prev.filter((it) => !(it.type === "role" && it.reference_id === r.id));
      }
      return [...prev, {
        type: "role",
        item_type: "role",
        reference_id: r.id,
        name: r.name,
        quantity: 1,
        days: r.rate_type === "Per Day" ? 1 : 1,
        unit_rate: r.default_rate || 0,
        rate_type: r.rate_type || "Per Event",
        gst_rate: 0,
        sac_code: ""
      }];
    });
  };

  const toggleService = (s) => {
    setItems((prev) => {
      if (prev.some((it) => it.type === "service" && it.reference_id === s.id)) {
        return prev.filter((it) => !(it.type === "service" && it.reference_id === s.id));
      }
      return [...prev, {
        type: "service",
        item_type: "service",
        reference_id: s.id,
        name: s.name,
        quantity: 1,
        days: s.rate_type === "Per Day" ? 1 : 1,
        unit_rate: s.default_rate || 0,
        rate_type: s.rate_type || "Fixed",
        gst_rate: s.gst_rate || 0,
        sac_code: s.sac_code || ""
      }];
    });
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
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

  const Chip = ({ item, selected, onClick, rateLabel }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-foreground hover:bg-muted/40"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center",
            selected ? "bg-primary border-primary" : "border-muted-foreground/40"
          )}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </span>
        {item.name}
      </span>
      {showPrices && <span className="text-muted-foreground">{rateLabel}</span>}
    </button>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <p className="text-sm text-muted-foreground">
        Tap roles and services to build a quick estimate. Rates come from your Preferences. Adjust quantity and rate per line.
      </p>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Show rates on chips</span>
          <Toggle checked={showPrices} onChange={setShowPrices} label="Show rates on chips" />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-4">
          Estimates are internal planning only — no payment or revenue is recorded.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Team Roles</h3>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No roles configured. Add them in Preferences.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <Chip
                  key={r.id}
                  item={r}
                  selected={isSelected("role", r.id)}
                  onClick={() => toggleRole(r)}
                  rateLabel={`${formatMoney(r.default_rate || 0, currency)} · ${r.rate_type}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Services</h3>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No services configured. Add them in Preferences.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => (
                <Chip
                  key={s.id}
                  item={s}
                  selected={isSelected("service", s.id)}
                  onClick={() => toggleService(s)}
                  rateLabel={`${formatMoney(s.default_rate || 0, currency)} · ${s.rate_type}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected items editor */}
      {items.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Estimate Items</h3>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-2 font-medium">Item</th>
                  <th className="text-right py-2 px-1 font-medium w-16">Qty</th>
                  <th className="text-right py-2 px-1 font-medium w-16">Days</th>
                  <th className="text-right py-2 px-1 font-medium w-28">Rate</th>
                  <th className="text-right py-2 px-1 font-medium w-28">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="py-2 pr-2">{it.name}</td>
                    <td className="py-2 px-1">
                      <Input type="number" min="0" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-8 text-right" />
                    </td>
                    <td className="py-2 px-1">
                      <Input
                        type="number" min="0"
                        value={it.rate_type === "Per Day" ? it.days : 1}
                        onChange={(e) => updateItem(idx, "days", Number(e.target.value))}
                        disabled={it.rate_type !== "Per Day"}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <Input type="number" min="0" value={it.unit_rate} onChange={(e) => updateItem(idx, "unit_rate", Number(e.target.value))} className="h-8 text-right" />
                    </td>
                    <td className="py-2 px-1 text-right font-medium">{formatMoney(lineTotal(it), currency)}</td>
                    <td className="py-2">
                      <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit margin */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Profit Margin</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>Markup</span>
          <span className="font-medium text-foreground">{markup}%</span>
        </div>
      </div>

      {/* Estimate + actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <Button variant="destructive" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button variant="dark" onClick={createQuotation} disabled={items.length === 0}>
          <FileText className="w-4 h-4" />
          Create Quotation
        </Button>
        <div className="bg-card border border-border rounded-lg p-4 flex-1 w-full">
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Team Cost</span>
            <span className="font-medium">{formatMoney(teamCost, currency)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Services Cost</span>
            <span className="font-medium">{formatMoney(servicesCost, currency)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatMoney(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Profit ({markup}%)</span>
            <span className="font-medium">{formatMoney(markupAmount, currency)}</span>
          </div>
          <div className="flex justify-between text-sm py-2 mt-2 border-t border-border">
            <span className="font-semibold">Estimated Total</span>
            <span className="font-bold">{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}