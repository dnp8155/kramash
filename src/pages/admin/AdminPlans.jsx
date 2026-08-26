import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Switch } from "@/components/ui/switch";
import LoadingState from "@/components/common/LoadingState";
import { Save, Crown, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

const NUMERIC_KEYS = ["max_events", "max_team_members", "max_services"];
const BOOLEAN_KEYS = ["pdf_export_enabled", "reminders_enabled"];
const KEY_LABELS = {
  max_events: "Max Events",
  max_team_members: "Max Team Members",
  max_services: "Max Services",
  pdf_export_enabled: "PDF Export",
  reminders_enabled: "Reminders"
};
const KEY_HINTS = {
  max_events: "Use -1 or 999999 for unlimited",
  max_team_members: "Use -1 or 999999 for unlimited",
  max_services: "Use -1 or 999999 for unlimited",
  pdf_export_enabled: "Allow quotation PDF export",
  reminders_enabled: "Enable event reminders"
};

export default function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [limits, setLimits] = useState([]);
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

  const togglePricingActive = async (p) => {
    setSaving(true);
    try {
      await base44.entities.PlanPricing.update(p.id, { is_active: !p.is_active });
      setPricings((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
      toast({ title: `${BILLING_LABELS[p.billing_cycle]} ${p.is_active ? "disabled" : "enabled"}` });
    } catch (e) {
      toast({ title: "Failed to toggle pricing", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading plan configuration…" />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and Pro subscription pricing</p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const planLimits = limits.filter((l) => l.plan_id === plan.id);
          const planPricings = pricings.filter((p) => p.plan_id === plan.id);
          const isPro = plan.code === "PRO";

          return (
            <div
              key={plan.id}
              className={cn(
                "bg-card border rounded-xl shadow-card overflow-hidden",
                isPro ? "border-amber-300" : "border-border"
              )}
            >
              {/* Card header */}
              <div className={cn(
                "px-5 py-4 flex items-center gap-3 border-b border-border",
                isPro ? "bg-amber-50" : "bg-muted/40"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isPro ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                )}>
                  {isPro ? <Crown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      isPro ? "bg-amber-200 text-amber-800" : "bg-muted text-muted-foreground"
                    )}>
                      {plan.code}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4">
                {/* Limits */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resource & Feature Limits</div>
                  <div className="space-y-2.5">
                    {NUMERIC_KEYS.map((key) => {
                      const limit = getLimit(plan.id, key);
                      if (!limit) return null;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{KEY_LABELS[key]}</div>
                            <div className="text-[11px] text-muted-foreground">{KEY_HINTS[key]}</div>
                          </div>
                          <Input
                            type="number"
                            value={limit.limit_value}
                            onChange={(e) => updateLimitValue(plan.id, key, e.target.value)}
                            className="w-24"
                          />
                          <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving} className="shrink-0">
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                        </div>
                      );
                    })}
                    {BOOLEAN_KEYS.map((key) => {
                      const limit = getLimit(plan.id, key);
                      if (!limit) return null;
                      const enabled = limit.limit_value === "true";
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{KEY_LABELS[key]}</div>
                            <div className="text-[11px] text-muted-foreground">{KEY_HINTS[key]}</div>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(val) => {
                              updateLimitValue(plan.id, key, val);
                            }}
                          />
                          <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving} className="shrink-0">
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                        </div>
                      );
                    })}
                    {planLimits.length === 0 && <p className="text-xs text-muted-foreground">No limits configured.</p>}
                  </div>
                </div>

                {/* Pricing (Pro only) */}
                {isPro && planPricings.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pricing Options (₹)</div>
                    <div className="space-y-2.5">
                      {planPricings.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="w-24">
                            <div className="text-sm font-medium text-foreground">{BILLING_LABELS[p.billing_cycle]}</div>
                            <div className="text-[11px] text-muted-foreground">{p.duration_months} months</div>
                          </div>
                          <Input
                            type="number"
                            value={p.price}
                            onChange={(e) => updatePricing(p.id, "price", e.target.value)}
                            className="w-28"
                          />
                          <span className="text-xs text-muted-foreground">INR</span>
                          <Button variant="outline" size="sm" onClick={() => savePricing(p)} disabled={saving} className="shrink-0">
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                          <button
                            onClick={() => togglePricingActive(p)}
                            disabled={saving}
                            className={cn(
                              "shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                              p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {p.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {p.is_active ? "Active" : "Off"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">
        Changes apply immediately to all workspaces. Existing active subscriptions keep their original assigned price.
      </p>
    </div>
  );
}