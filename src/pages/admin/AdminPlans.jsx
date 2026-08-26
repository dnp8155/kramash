import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Switch } from "@/components/ui/switch";
import LoadingState from "@/components/common/LoadingState";
import { Save, Crown, Sparkles, Check, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreatePlanDialog, AddLimitDialog, AddPricingDialog } from "@/components/admin/PlanDialogs";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

const NUMERIC_KEYS = ["max_events", "max_team_members", "max_services", "max_storage_gb"];
const BOOLEAN_KEYS = ["pdf_export_enabled", "reminders_enabled"];
const ALL_LIMIT_KEYS = [...NUMERIC_KEYS, ...BOOLEAN_KEYS];
const KEY_LABELS = {
  max_events: "Max Events",
  max_team_members: "Max Team Members",
  max_services: "Max Services",
  max_storage_gb: "Database Storage (GB)",
  pdf_export_enabled: "PDF Export",
  reminders_enabled: "Reminders"
};
const KEY_HINTS = {
  max_events: "Use 999999 for unlimited",
  max_team_members: "Use 999999 for unlimited",
  max_services: "Use 999999 for unlimited",
  max_storage_gb: "Total DB storage in GB (e.g. 5, 50)",
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
  const [createOpen, setCreateOpen] = useState(false);
  const [limitDialog, setLimitDialog] = useState(null); // planId
  const [pricingDialog, setPricingDialog] = useState(null); // planId

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

  const deleteLimit = async (planId, key) => {
    const limit = getLimit(planId, key);
    if (!limit) return;
    if (!confirm(`Remove ${KEY_LABELS[key]} limit?`)) return;
    try {
      await base44.entities.PlanLimit.delete(limit.id);
      setLimits((prev) => prev.filter((l) => l.id !== limit.id));
      toast({ title: `${KEY_LABELS[key]} removed` });
    } catch (e) {
      toast({ title: "Failed to remove limit", description: e?.message, variant: "destructive" });
    }
  };

  const updatePricing = (id, field, value) => {
    setPricings((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: ["price", "storage_gb"].includes(field) ? Number(value) : value } : p)));
  };

  const savePricing = async (p) => {
    setSaving(true);
    try {
      await base44.entities.PlanPricing.update(p.id, {
        price: Number(p.price) || 0,
        storage_gb: Number(p.storage_gb) || 0,
        is_active: p.is_active
      });
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

  const deletePricing = async (p) => {
    if (!confirm(`Remove ${BILLING_LABELS[p.billing_cycle]} pricing?`)) return;
    try {
      await base44.entities.PlanPricing.delete(p.id);
      setPricings((prev) => prev.filter((x) => x.id !== p.id));
      toast({ title: "Pricing removed" });
    } catch (e) {
      toast({ title: "Failed to remove pricing", description: e?.message, variant: "destructive" });
    }
  };

  if (loading) return <LoadingState label="Loading plan configuration…" />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and subscription pricing</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const planLimits = limits.filter((l) => l.plan_id === plan.id);
          const planPricings = pricings.filter((p) => p.plan_id === plan.id);
          const isFree = plan.code === "FREE";
          const existingKeys = planLimits.map((l) => l.limit_key);
          const existingCycles = planPricings.map((p) => p.billing_cycle);

          return (
            <div
              key={plan.id}
              className={cn(
                "bg-card border rounded-xl shadow-card overflow-hidden",
                isFree ? "border-border" : "border-amber-300"
              )}
            >
              {/* Card header */}
              <div className={cn(
                "px-5 py-4 flex items-center gap-3 border-b border-border",
                isFree ? "bg-muted/40" : "bg-amber-50"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isFree ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-600"
                )}>
                  {isFree ? <Sparkles className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground truncate">{plan.name}</h2>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                      isFree ? "bg-muted text-muted-foreground" : "bg-amber-200 text-amber-800"
                    )}>
                      {plan.code}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4">
                {/* Limits */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resource & Feature Limits</div>
                    {existingKeys.length < ALL_LIMIT_KEYS.length && (
                      <button
                        onClick={() => setLimitDialog(plan.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {planLimits.map((pl) => {
                      const key = pl.limit_key;
                      const isBool = BOOLEAN_KEYS.includes(key);
                      const enabled = pl.limit_value === "true";
                      return (
                        <div key={key} className="flex items-center gap-2 group">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{KEY_LABELS[key]}</div>
                            <div className="text-[11px] text-muted-foreground">{KEY_HINTS[key]}</div>
                          </div>
                          {isBool ? (
                            <Switch
                              checked={enabled}
                              onCheckedChange={(val) => updateLimitValue(plan.id, key, val)}
                            />
                          ) : (
                            <Input
                              type="number"
                              value={pl.limit_value}
                              onChange={(e) => updateLimitValue(plan.id, key, e.target.value)}
                              className="w-24"
                            />
                          )}
                          <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving} className="shrink-0">
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                          <button
                            onClick={() => deleteLimit(plan.id, key)}
                            className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove limit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {planLimits.length === 0 && <p className="text-xs text-muted-foreground">No limits configured. Click &quot;Add&quot; to create one.</p>}
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing Options (₹)</div>
                    {existingCycles.length < 3 && (
                      <button
                        onClick={() => setPricingDialog(plan.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {planPricings.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 group">
                        <div className="w-24">
                          <div className="text-sm font-medium text-foreground">{BILLING_LABELS[p.billing_cycle]}</div>
                          <div className="text-[11px] text-muted-foreground">{p.duration_months} months</div>
                        </div>
                        <Input
                          type="number"
                          value={p.price}
                          onChange={(e) => updatePricing(p.id, "price", e.target.value)}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">INR</span>
                        <Input
                          type="number"
                          value={p.storage_gb ?? 0}
                          onChange={(e) => updatePricing(p.id, "storage_gb", e.target.value)}
                          className="w-20"
                          title="Database storage (GB) for this billing cycle"
                        />
                        <span className="text-xs text-muted-foreground">GB</span>
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
                        <button
                          onClick={() => deletePricing(p)}
                          className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove pricing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {planPricings.length === 0 && (
                      <p className="text-xs text-muted-foreground">{isFree ? "Free plan — no pricing needed." : "No pricing configured. Click \u201cAdd\u201d to set a price."}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">
        Changes apply immediately to all workspaces. Existing active subscriptions keep their original assigned price.
      </p>

      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => load()}
      />
      {limitDialog && (
        <AddLimitDialog
          open={!!limitDialog}
          onOpenChange={(v) => !v && setLimitDialog(null)}
          planId={limitDialog}
          existingKeys={limits.filter((l) => l.plan_id === limitDialog).map((l) => l.limit_key)}
          onAdded={() => load()}
        />
      )}
      {pricingDialog && (
        <AddPricingDialog
          open={!!pricingDialog}
          onOpenChange={(v) => !v && setPricingDialog(null)}
          planId={pricingDialog}
          existingCycles={pricings.filter((p) => p.plan_id === pricingDialog).map((p) => p.billing_cycle)}
          onAdded={() => load()}
        />
      )}
    </div>
  );
}