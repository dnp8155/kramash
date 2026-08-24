import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import LoadingState from "@/components/common/LoadingState";
import { Save } from "lucide-react";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };
const BILLING_DURATION = { MONTHLY: 1, SIX_MONTHS: 6, ANNUAL: 12 };

const NUMERIC_KEYS = ["max_events", "max_team_members", "max_services"];
const BOOLEAN_KEYS = ["pdf_export_enabled", "reminders_enabled"];
const KEY_LABELS = {
  max_events: "Max Events",
  max_team_members: "Max Team Members",
  max_services: "Max Services",
  pdf_export_enabled: "PDF Export",
  reminders_enabled: "Reminders"
};

export default function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [limits, setLimits] = useState([]); // all PlanLimit rows
  const [pricings, setPricings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l, pr] = await Promise.all([
        base44.entities.Plan.list(),
        base44.entities.PlanLimit.list(),
        base44.entities.PlanPricing.list()
      ]);
      setPlans(p.sort((a, b) => a.sort_order - b.sort_order));
      setLimits(l);
      setPricings(pr.sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      toast({ title: "Failed to load plan config", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const getLimit = (planId, key) => limits.find((l) => l.plan_id === planId && l.limit_key === key);

  const updateLimitValue = (planId, key, value) => {
    setLimits((prev) => {
      const idx = prev.findIndex((l) => l.plan_id === planId && l.limit_key === key);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], limit_value: String(value) };
      return copy;
    });
  };

  const saveLimit = async (planId, key) => {
    const limit = getLimit(planId, key);
    if (!limit) return;
    setSaving(true);
    try {
      await base44.entities.PlanLimit.update(limit.id, { limit_value: String(limit.limit_value), enabled: true });
      toast({ title: `${KEY_LABELS[key]} updated` });
    } catch (e) {
      toast({ title: "Failed to update limit", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updatePricing = (id, field, value) => {
    setPricings((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: field === "price" ? Number(value) : value } : p)));
  };

  const savePricing = async (p) => {
    setSaving(true);
    try {
      await base44.entities.PlanPricing.update(p.id, { price: Number(p.price) || 0, is_active: p.is_active });
      toast({ title: `${BILLING_LABELS[p.billing_cycle]} pricing updated` });
    } catch (e) {
      toast({ title: "Failed to update pricing", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading plan configuration…" />;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-lg font-semibold">Plans & Pricing</h1>

      {plans.map((plan) => {
        const planLimits = limits.filter((l) => l.plan_id === plan.id);
        const planPricings = pricings.filter((p) => p.plan_id === plan.id);
        return (
          <div key={plan.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{plan.name} <span className="text-xs text-muted-foreground font-normal">({plan.code})</span></h2>
            </div>

            {/* Limits */}
            <div className="text-xs text-muted-foreground mb-2">Resource & Feature Limits</div>
            <div className="space-y-2">
              {NUMERIC_KEYS.map((key) => {
                const limit = getLimit(plan.id, key);
                if (!limit) return null;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="w-40 text-sm font-normal">{KEY_LABELS[key]}</Label>
                    <Input
                      type="number"
                      value={limit.limit_value}
                      onChange={(e) => updateLimitValue(plan.id, key, e.target.value)}
                      className="w-32"
                    />
                    <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving}>
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                );
              })}
              {BOOLEAN_KEYS.map((key) => {
                const limit = getLimit(plan.id, key);
                if (!limit) return null;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="w-40 text-sm font-normal">{KEY_LABELS[key]}</Label>
                    <Select
                      value={limit.limit_value === "true" ? "true" : "false"}
                      onChange={(e) => updateLimitValue(plan.id, key, e.target.value)}
                      className="w-32"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving}>
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                );
              })}
              {planLimits.length === 0 && <p className="text-xs text-muted-foreground">No limits configured.</p>}
            </div>

            {/* Pricing (Pro only) */}
            {plan.code === "PRO" && planPricings.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground mt-4 mb-2">Pricing Options (₹)</div>
                <div className="space-y-2">
                  {planPricings.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 flex-wrap">
                      <span className="w-28 text-sm">{BILLING_LABELS[p.billing_cycle]}</span>
                      <Input
                        type="number"
                        value={p.price}
                        onChange={(e) => updatePricing(p.id, "price", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-xs text-muted-foreground">/ {p.duration_months} mo</span>
                      <Button variant="outline" size="sm" onClick={() => savePricing(p)} disabled={saving}>
                        <Save className="w-3.5 h-3.5" /> Save
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Changes apply immediately to all workspaces. Existing active subscriptions keep their original assigned price.
      </p>
    </div>
  );
}