import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Switch } from "@/components/ui/switch";
import LoadingState from "@/components/common/LoadingState";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Crown, Sparkles, Check, X, Plus, Trash2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreatePlanDialog, AddLimitDialog, AddPricingDialog } from "@/components/admin/PlanDialogs";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

const NUMERIC_KEYS = ["max_events", "max_team_members", "max_services", "max_storage_gb", "max_leads"];
const BOOLEAN_KEYS = [
  "pdf_export_enabled", "reminders_enabled", "quotation_enabled", "notifications_enabled",
  "link_sharing_enabled", "client_portal_enabled", "team_portal_enabled",
  "excel_csv_export_enabled", "event_display_customization_enabled",
  "quotation_logo_enabled", "advanced_theme_enabled"
];
const ALL_LIMIT_KEYS = [...NUMERIC_KEYS, ...BOOLEAN_KEYS];
const KEY_LABELS = {
  max_events: "Max Events", max_team_members: "Max Team Members", max_services: "Max Services",
  max_storage_gb: "Database Storage (GB)", max_leads: "Max Leads",
  pdf_export_enabled: "PDF Export", reminders_enabled: "Reminders",
  quotation_enabled: "Quotations & Invoices", notifications_enabled: "Notifications",
  link_sharing_enabled: "Link Sharing", client_portal_enabled: "Client Portal",
  team_portal_enabled: "Team Portal", excel_csv_export_enabled: "Excel/CSV Export",
  event_display_customization_enabled: "Event Display Customization",
  quotation_logo_enabled: "Quotation Logo", advanced_theme_enabled: "Advanced Themes"
};
const KEY_HINTS = {
  max_events: "Use 999999 for unlimited", max_team_members: "Use 999999 for unlimited",
  max_services: "Use 999999 for unlimited", max_storage_gb: "Total DB storage in GB (e.g. 5, 50)",
  max_leads: "Use 999999 for unlimited",
  pdf_export_enabled: "Allow quotation PDF export", reminders_enabled: "Enable event reminders",
  quotation_enabled: "Enable Quotation & Invoice creation", notifications_enabled: "Enable app notifications",
  link_sharing_enabled: "Enable public link sharing", client_portal_enabled: "Enable Client Portal",
  team_portal_enabled: "Enable Team Member Portal", excel_csv_export_enabled: "Enable Excel & CSV data exports",
  event_display_customization_enabled: "Allow customizing event cards & invoice logos",
  quotation_logo_enabled: "Allow custom logos on quotations", advanced_theme_enabled: "Enable Night & Pastel themes"
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
  const [createOpen, setCreateOpen] = useState(false);
  const [limitDialog, setLimitDialog] = useState(null);
  const [pricingDialog, setPricingDialog] = useState(null);

  const reload = useCallback(() => queryClient.invalidateQueries({ queryKey: ["admin", "plans-config"] }), [queryClient]);

  useEffect(() => { if (data) { setPlans(data.plans); setLimits(data.limits); setPricings(data.pricings); } }, [data]);

  const getLimit = (planId, key) => limits.find((l) => l.plan_id === planId && l.limit_key === key);

  const updateLimitValue = (planId, key, value) => {
    setLimits((prev) => { const idx = prev.findIndex((l) => l.plan_id === planId && l.limit_key === key); if (idx === -1) return prev; const copy = [...prev]; copy[idx] = { ...copy[idx], limit_value: String(value) }; return copy; });
  };

  const saveLimit = async (planId, key) => {
    const limit = getLimit(planId, key); if (!limit) return; setSaving(true);
    try { await base44.entities.PlanLimit.update(limit.id, { limit_value: String(limit.limit_value), enabled: true }); toast({ title: `${KEY_LABELS[key]} updated` }); reload(); }
    catch (e) { toast({ title: "Failed to update limit", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteLimit = async (planId, key) => {
    const limit = getLimit(planId, key); if (!limit) return; if (!confirm(`Remove ${KEY_LABELS[key]} limit?`)) return;
    try { await base44.entities.PlanLimit.delete(limit.id); setLimits((prev) => prev.filter((l) => l.id !== limit.id)); toast({ title: `${KEY_LABELS[key]} removed` }); reload(); }
    catch (e) { toast({ title: "Failed to remove limit", description: e?.message, variant: "destructive" }); }
  };

  const updatePricing = (id, field, value) => { setPricings((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: ["price", "storage_gb"].includes(field) ? Number(value) : value } : p))); };

  const savePricing = async (p) => { setSaving(true); try { await base44.entities.PlanPricing.update(p.id, { price: Number(p.price) || 0, storage_gb: Number(p.storage_gb) || 0, is_active: p.is_active }); toast({ title: `${BILLING_LABELS[p.billing_cycle]} pricing updated` }); reload(); } catch (e) { toast({ title: "Failed to update pricing", description: e?.message, variant: "destructive" }); } finally { setSaving(false); } };

  const togglePricingActive = async (p) => { setSaving(true); try { await base44.entities.PlanPricing.update(p.id, { is_active: !p.is_active }); setPricings((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))); toast({ title: `${BILLING_LABELS[p.billing_cycle]} ${p.is_active ? "disabled" : "enabled"}` }); reload(); } catch (e) { toast({ title: "Failed to toggle pricing", description: e?.message, variant: "destructive" }); } finally { setSaving(false); } };

  const deletePricing = async (p) => { if (!confirm(`Remove ${BILLING_LABELS[p.billing_cycle]} pricing?`)) return; try { await base44.entities.PlanPricing.delete(p.id); setPricings((prev) => prev.filter((x) => x.id !== p.id)); toast({ title: "Pricing removed" }); reload(); } catch (e) { toast({ title: "Failed to remove pricing", description: e?.message, variant: "destructive" }); } };

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap"><div><h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1><p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and subscription pricing</p></div><Skeleton className="h-9 w-28 rounded-md" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </span>
        Back to Admin Dashboard
      </button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h1 className="text-xl font-bold text-foreground">Plans & Pricing</h1><p className="text-sm text-muted-foreground mt-0.5">Configure plan limits and subscription pricing</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const planLimits = limits.filter((l) => l.plan_id === plan.id);
          const planPricings = pricings.filter((p) => p.plan_id === plan.id);
          const isFree = plan.code === "FREE";
          const existingKeys = planLimits.map((l) => l.limit_key);
          const existingCycles = planPricings.map((p) => p.billing_cycle);
          return (
            <div key={plan.id} className={cn("bg-card border rounded-xl shadow-card overflow-hidden", isFree ? "border-border" : "border-amber-200")}>
              <div className={cn("px-5 py-4 flex items-center gap-3 border-b border-border", isFree ? "bg-muted/40" : "bg-amber-50/50")}>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isFree ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-600")}>{isFree ? <Sparkles className="w-5 h-5" /> : <Crown className="w-5 h-5" />}</div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h2 className="text-base font-bold text-foreground truncate">{plan.name}</h2><span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0", isFree ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700")}>{plan.code}</span></div>{plan.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>}</div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resource & Feature Limits</div>{existingKeys.length < ALL_LIMIT_KEYS.length && <button onClick={() => setLimitDialog(plan.id)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="w-3 h-3" /> Add</button>}</div>
                  <div className="space-y-2.5">
                    {planLimits.map((pl) => {
                      const key = pl.limit_key; const isBool = BOOLEAN_KEYS.includes(key); const enabled = pl.limit_value === "true";
                      return (
                        <div key={key} className="flex flex-wrap items-center gap-2 group">
                          <div className="flex-1 min-w-[120px]"><div className="text-sm font-medium text-foreground">{KEY_LABELS[key]}</div><div className="text-[11px] text-muted-foreground">{KEY_HINTS[key]}</div></div>
                          {isBool ? <Switch checked={enabled} onCheckedChange={(val) => updateLimitValue(plan.id, key, val)} /> : <Input type="number" value={pl.limit_value} onChange={(e) => updateLimitValue(plan.id, key, e.target.value)} className="w-20 sm:w-24" />}
                          <Button variant="outline" size="sm" onClick={() => saveLimit(plan.id, key)} disabled={saving} className="shrink-0"><Save className="w-3.5 h-3.5" /> Save</Button>
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
                    {planPricings.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 group">
                        <div className="w-20 sm:w-24"><div className="text-sm font-medium text-foreground">{BILLING_LABELS[p.billing_cycle]}</div><div className="text-[11px] text-muted-foreground">{p.duration_months} months</div></div>
                        <Input type="number" value={p.price} onChange={(e) => updatePricing(p.id, "price", e.target.value)} className="w-20 sm:w-24" />
                        <span className="text-xs text-muted-foreground">INR</span>
                        <Input type="number" value={p.storage_gb ?? 0} onChange={(e) => updatePricing(p.id, "storage_gb", e.target.value)} className="w-16 sm:w-20" title="Database storage (GB) for this billing cycle" />
                        <span className="text-xs text-muted-foreground">GB</span>
                        <Button variant="outline" size="sm" onClick={() => savePricing(p)} disabled={saving} className="shrink-0"><Save className="w-3.5 h-3.5" /> Save</Button>
                        <button onClick={() => togglePricingActive(p)} disabled={saving} className={cn("shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors", p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{p.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{p.is_active ? "Active" : "Off"}</button>
                        <button onClick={() => deletePricing(p)} className="shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity" title="Remove pricing"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
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