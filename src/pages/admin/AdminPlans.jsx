import AdminBackButton from "@/components/admin/AdminBackButton";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Crown, Sparkles, Check, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreatePlanDialog, AddLimitDialog, AddPricingDialog } from "@/components/admin/PlanDialogs";
import { askConfirm } from "@/lib/confirmDialog";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

const NUMERIC_KEYS = ["max_events", "max_team_members", "max_services", "max_storage_gb"];
const BOOLEAN_KEYS = ["pdf_export_enabled", "reminders_enabled"];
const ALL_LIMIT_KEYS = [...NUMERIC_KEYS, ...BOOLEAN_KEYS];
const KEY_LABELS = {
  max_events: "Max Events", max_team_members: "Max Team Members", max_services: "Max Services",
  max_storage_gb: "Database Storage (GB)", pdf_export_enabled: "PDF Export", reminders_enabled: "Reminders"
};
const KEY_HINTS = {
  max_events: "Use 999999 for unlimited", max_team_members: "Use 999999 for unlimited",
  max_services: "Use 999999 for unlimited", max_storage_gb: "Total DB storage in GB (e.g. 5, 50)",
  pdf_export_enabled: "Always on — PDF export is available on every plan", reminders_enabled: "Enable event reminders"
};

export default function AdminPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin", "plans-config"],
    queryFn: async () => {
      const [p, l, pr] = await Promise.all([base44.entities.Plan.list(), base44.entities.PlanLimit.list(), base44.entities.PlanPricing.list()]);
      return { plans: p.sort((a, b) => a.sort_order - b.sort_order), limits: l, pricings: pr.sort((a, b) => a.sort_order - b.sort_order) };
    },
    staleTime: 30 * 1000,
  });

  const [plans, setPlans] = useState(() => data?.plans || []);
  const [limits, setLimits] = useState(() => data?.limits || []);
  const [pricings, setPricings] = useState(() => data?.pricings || []);
  const [saving, setSaving] = useState(false);
  // What has been typed or switched but not saved yet. Saved values stay in limits / pricings, so saving one row (or a
  // reload) never wipes the edits in the others, and a row is "changed" only while its edit differs from what is saved.
  const [limitEdits, setLimitEdits] = useState({});   // "planId:limitKey" -> value
  const [priceEdits, setPriceEdits] = useState({});   // pricing id -> { price?, storage_gb? }
  const [createOpen, setCreateOpen] = useState(false);
  const [limitDialog, setLimitDialog] = useState(null);
  const [pricingDialog, setPricingDialog] = useState(null);

  const reload = useCallback(() => queryClient.invalidateQueries({ queryKey: ["admin", "plans-config"] }), [queryClient]);

  useEffect(() => { if (data) { setPlans(data.plans); setLimits(data.limits); setPricings(data.pricings); } }, [data]);

  const getLimit = (planId, key) => limits.find((l) => l.plan_id === planId && l.limit_key === key);

  const limitKey = (pl) => `${pl.plan_id}:${pl.limit_key}`;
  const limitValue = (pl) => (limitKey(pl) in limitEdits ? limitEdits[limitKey(pl)] : pl.limit_value);
  const limitDirty = (pl) => limitKey(pl) in limitEdits && String(limitEdits[limitKey(pl)]) !== String(pl.limit_value);
  const updateLimitValue = (planId, key, value) => setLimitEdits((prev) => ({ ...prev, [`${planId}:${key}`]: String(value) }));

  // Writes a saved change into the shown data and the query cache, and drops its edit.
  const applySavedLimit = (pl, value) => {
    const patch = (x) => (x.id === pl.id ? { ...x, limit_value: value, enabled: true } : x);
    setLimits((prev) => prev.map(patch));
    queryClient.setQueryData(["admin", "plans-config"], (old) => old && { ...old, limits: old.limits.map(patch) });
    setLimitEdits((prev) => { const n = { ...prev }; delete n[limitKey(pl)]; return n; });
  };

  const saveLimit = async (planId, key) => {
    const limit = getLimit(planId, key); if (!limit || !limitDirty(limit)) return; setSaving(true);
    const value = String(limitEdits[limitKey(limit)]);
    try { await base44.entities.PlanLimit.update(limit.id, { limit_value: value, enabled: true }); applySavedLimit(limit, value); toast({ title: `${KEY_LABELS[key]} updated` }); }
    catch (e) { toast({ title: "Failed to update limit", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteLimit = async (planId, key) => {
    const limit = getLimit(planId, key); if (!limit) return; if (!await askConfirm(`Remove ${KEY_LABELS[key]} limit?`)) return;
    try { await base44.entities.PlanLimit.delete(limit.id); setLimits((prev) => prev.filter((l) => l.id !== limit.id)); toast({ title: `${KEY_LABELS[key]} removed` }); reload(); }
    catch (e) { toast({ title: "Failed to remove limit", description: e?.message, variant: "destructive" }); }
  };

  const priceField = (p, f) => (priceEdits[p.id] && f in priceEdits[p.id] ? priceEdits[p.id][f] : p[f]);
  const priceDirty = (p) => {
    const e = priceEdits[p.id];
    return !!e && (("price" in e && Number(e.price) !== Number(p.price)) || ("storage_gb" in e && Number(e.storage_gb) !== Number(p.storage_gb ?? 0)));
  };
  const updatePricing = (id, field, value) => setPriceEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const applySavedPricing = (p, patch) => {
    const apply = (x) => (x.id === p.id ? { ...x, ...patch } : x);
    setPricings((prev) => prev.map(apply));
    queryClient.setQueryData(["admin", "plans-config"], (old) => old && { ...old, pricings: old.pricings.map(apply) });
    setPriceEdits((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
  };
  // A cleared price box must never be saved as 0 — that would make the plan free.
  const pricingPatch = (p) => {
    if (String(priceField(p, "price") ?? "").trim() === "") throw new Error("Enter a price first");
    return { price: Number(priceField(p, "price")) || 0, storage_gb: Number(priceField(p, "storage_gb")) || 0 };
  };

  const savePricing = async (p) => {
    if (!priceDirty(p)) return;
    setSaving(true);
    try {
      const patch = pricingPatch(p);
      await base44.entities.PlanPricing.update(p.id, { ...patch, is_active: p.is_active });
      applySavedPricing(p, patch);
      toast({ title: `${BILLING_LABELS[p.billing_cycle]} pricing updated` });
    } catch (e) {
      toast({ title: "Failed to update pricing", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Saves every changed limit and price of one plan in one go.
  const saveAllForPlan = async (planId) => {
    const dirtyPrices = pricings.filter((x) => x.plan_id === planId && priceDirty(x));
    const dirtyLimits = limits.filter((x) => x.plan_id === planId && limitDirty(x));
    if (dirtyPrices.length + dirtyLimits.length === 0) return;
    setSaving(true);
    let ok = 0; const failed = [];
    for (const x of dirtyPrices) {
      try { const patch = pricingPatch(x); await base44.entities.PlanPricing.update(x.id, { ...patch, is_active: x.is_active }); applySavedPricing(x, patch); ok++; }
      catch { failed.push(BILLING_LABELS[x.billing_cycle]); }
    }
    for (const x of dirtyLimits) {
      try { const value = String(limitEdits[limitKey(x)]); await base44.entities.PlanLimit.update(x.id, { limit_value: value, enabled: true }); applySavedLimit(x, value); ok++; }
      catch { failed.push(KEY_LABELS[x.limit_key] || x.limit_key); }
    }
    setSaving(false);
    if (failed.length) toast({ title: `${ok} saved, ${failed.length} failed`, description: failed.join(", "), variant: "destructive" });
    else toast({ title: `${ok} change${ok === 1 ? "" : "s"} saved` });
  };

  const togglePricingActive = async (p) => { setSaving(true); try { await base44.entities.PlanPricing.update(p.id, { is_active: !p.is_active }); setPricings((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))); toast({ title: `${BILLING_LABELS[p.billing_cycle]} ${p.is_active ? "disabled" : "enabled"}` }); reload(); } catch (e) { toast({ title: "Failed to toggle pricing", description: e?.message, variant: "destructive" }); } finally { setSaving(false); } };

  const deletePricing = async (p) => { if (!await askConfirm(`Remove ${BILLING_LABELS[p.billing_cycle]} pricing?`)) return; try { await base44.entities.PlanPricing.delete(p.id); setPricings((prev) => prev.filter((x) => x.id !== p.id)); toast({ title: "Pricing removed" }); reload(); } catch (e) { toast({ title: "Failed to remove pricing", description: e?.message, variant: "destructive" }); } };

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap"><div className="flex items-start gap-3"><AdminBackButton /><div><h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1><p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and subscription pricing</p></div></div><Skeleton className="h-9 w-28 rounded-md" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-64 w-full rounded-[15px]" /><Skeleton className="h-64 w-full rounded-[15px]" /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3"><AdminBackButton /><div><h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1><p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and subscription pricing</p></div></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const planLimits = limits.filter((l) => l.plan_id === plan.id);
          const planPricings = pricings.filter((p) => p.plan_id === plan.id);
          const isFree = plan.code === "FREE";
          const existingKeys = planLimits.map((l) => l.limit_key);
          const existingCycles = planPricings.map((p) => p.billing_cycle);
          const changedCount = planLimits.filter(limitDirty).length + planPricings.filter(priceDirty).length;
          return (
            <div key={plan.id} className={cn("bg-card border rounded-[15px] shadow-card overflow-hidden", isFree ? "border-border" : "border-amber-200")}>
              <div className={cn("px-5 py-4 flex items-center gap-3 border-b border-border", isFree ? "bg-muted/40" : "bg-amber-50/50")}>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isFree ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-600")}>{isFree ? <Sparkles className="w-5 h-5" /> : <Crown className="w-5 h-5" />}</div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h2 className="text-base font-bold text-foreground truncate">{plan.name}</h2><span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0", isFree ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700")}>{plan.code}</span></div>{plan.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>}</div>
              </div>

              <div className="p-5 space-y-4">
                {changedCount > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                    <span className="text-xs text-foreground">{changedCount} unsaved change{changedCount === 1 ? "" : "s"} in {plan.name}</span>
                    <Button size="sm" variant="primary" onClick={() => saveAllForPlan(plan.id)} disabled={saving}><Save className="w-3.5 h-3.5" /> Save all changes</Button>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resource & Feature Limits</div>{existingKeys.length < ALL_LIMIT_KEYS.length && <button onClick={() => setLimitDialog(plan.id)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="w-3 h-3" /> Add</button>}</div>
                  <div className="space-y-2.5">
                    {planLimits.map((pl) => {
                      const key = pl.limit_key; const isBool = BOOLEAN_KEYS.includes(key); const enabled = String(limitValue(pl)) === "true"; const dirty = limitDirty(pl);
                      return (
                        <div key={key} className="flex flex-wrap items-center gap-2 group">
                          <div className="flex-1 min-w-[120px]"><div className="text-sm font-medium text-foreground">{KEY_LABELS[key]}</div><div className="text-[11px] text-muted-foreground">{KEY_HINTS[key]}</div></div>
                          {isBool ? <Switch checked={enabled} onCheckedChange={(val) => updateLimitValue(plan.id, key, val)} /> : <Input type="number" value={limitValue(pl)} onChange={(e) => updateLimitValue(plan.id, key, e.target.value)} className="w-20 sm:w-24" />}
                          {dirty && <span className="text-[11px] font-medium text-warning">Unsaved</span>}
                          <Button variant={dirty ? "primary" : "outline"} size="sm" onClick={() => saveLimit(plan.id, key)} disabled={!dirty || saving} className="shrink-0"><Save className="w-3.5 h-3.5" /> Save</Button>
                          <button onClick={() => deleteLimit(plan.id, key)} className="shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity" title="Remove limit"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                    {planLimits.length === 0 && <p className="text-xs text-muted-foreground">No limits configured. Click &quot;Add&quot; to create one.</p>}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing Options (₹)</div>{existingCycles.length < 3 && <button onClick={() => setPricingDialog(plan.id)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="w-3 h-3" /> Add</button>}</div>
                  <div className="space-y-2.5">
                    {planPricings.map((p) => { const dirty = priceDirty(p); return (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 group">
                        <div className="w-20 sm:w-24"><div className="text-sm font-medium text-foreground">{BILLING_LABELS[p.billing_cycle]}</div><div className="text-[11px] text-muted-foreground">{p.duration_months} months</div></div>
                        <Input type="number" value={priceField(p, "price")} onChange={(e) => updatePricing(p.id, "price", e.target.value)} className="w-20 sm:w-24" />
                        <span className="text-xs text-muted-foreground">INR</span>
                        <Input type="number" value={priceField(p, "storage_gb") ?? 0} onChange={(e) => updatePricing(p.id, "storage_gb", e.target.value)} className="w-16 sm:w-20" title="Database storage (GB) for this billing cycle" />
                        <span className="text-xs text-muted-foreground">GB</span>
                        {dirty && <span className="text-[11px] font-medium text-warning">Unsaved</span>}
                        <Button variant={dirty ? "primary" : "outline"} size="sm" onClick={() => savePricing(p)} disabled={!dirty || saving} className="shrink-0"><Save className="w-3.5 h-3.5" /> Save</Button>
                        <button onClick={() => togglePricingActive(p)} disabled={saving} className={cn("shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors", p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{p.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{p.is_active ? "Active" : "Off"}</button>
                        <button onClick={() => deletePricing(p)} className="shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity" title="Remove pricing"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ); })}
                    {planPricings.length === 0 && <p className="text-xs text-muted-foreground">{isFree ? "Free plan — no pricing needed." : "No pricing configured. Click \u201cAdd\u201d to set a price."}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">Changes apply immediately to all workspaces. Existing active subscriptions keep their original assigned price.</p>

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
      {limitDialog && <AddLimitDialog open={!!limitDialog} onOpenChange={(v) => !v && setLimitDialog(null)} planId={limitDialog} existingKeys={limits.filter((l) => l.plan_id === limitDialog).map((l) => l.limit_key)} onAdded={reload} />}
      {pricingDialog && <AddPricingDialog open={!!pricingDialog} onOpenChange={(v) => !v && setPricingDialog(null)} planId={pricingDialog} existingCycles={pricings.filter((p) => p.plan_id === pricingDialog).map((p) => p.billing_cycle)} onAdded={reload} />}
    </div>
  );
}