import { useState } from "react";
import { Crown, Check, X } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { usePlans } from "@/hooks/usePlans";
import { formatCurrency } from "@/utils/format";
import { RESOURCE_LABELS, FEATURE_LABELS, formatLimit, UNLIMITED } from "@/utils/plan";
import { toast } from "@/components/ui/use-toast";

const RESOURCE_KEYS = ["max_events", "max_team_members", "max_services"];
const FEATURE_KEYS = ["quotation_enabled", "pdf_export_enabled", "advanced_theme_enabled", "reminders_enabled"];

export default function AdminPlans() {
  const { plans, pricings, limits, loading, error, refetch, updateLimit, updatePricing, updatePlan } = usePlans();
  const [editing, setEditing] = useState({});

  if (loading) return <LoadingState label="Loading plan configuration…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const freePlan = plans.find((p) => p.code === "FREE");
  const proPlan = plans.find((p) => p.code === "PRO");

  const getLimit = (planId, key) => limits.find((l) => l.plan_id === planId && l.limit_key === key);

  const handleSaveLimit = async (planId, key, value) => {
    const limit = getLimit(planId, key);
    if (!limit) return;
    const numValue = key.startsWith("max_") ? Number(value) : value ? 1 : 0;
    try {
      await updateLimit(limit.id, { limit_value: numValue });
      toast({ title: "Limit updated" });
      setEditing((prev) => ({ ...prev, [`${planId}_${key}`]: false }));
    } catch (e) {
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    }
  };

  const handleSavePricing = async (pricingId, newPrice) => {
    try {
      await updatePricing(pricingId, { price: Number(newPrice) });
      toast({ title: "Price updated" });
      setEditing((prev) => ({ ...prev, [`pricing_${pricingId}`]: false }));
    } catch (e) {
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    }
  };

  const renderPlanCard = (plan, isPro) => {
    const planLimits = limits.filter((l) => l.plan_id === plan.id);
    const planPricings = pricings.filter((p) => p.plan_id === plan.id && p.is_active);

    return (
      <Card className={isPro ? "border-warning/30" : ""}>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPro ? <Crown className="h-5 w-5 text-warning" /> : null}
            <CardTitle>{plan.name} Plan</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{plan.code}</span>
        </CardHeader>
        <CardBody className="space-y-5">
          {/* Resource Limits */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resource Limits</p>
            <div className="space-y-2">
              {RESOURCE_KEYS.map((key) => {
                const limit = getLimit(plan.id, key);
                const editKey = `${plan.id}_${key}`;
                const isEditing = editing[editKey];
                const currentValue = limit?.limit_value ?? 0;
                return (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-foreground">{RESOURCE_LABELS[key]}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          defaultValue={isPro ? (currentValue >= UNLIMITED ? 999999 : currentValue) : currentValue}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveLimit(plan.id, key, e.target.value);
                          }}
                          className="h-8 w-20 rounded border border-input bg-card px-2 text-sm text-right focus:border-primary focus:outline-none"
                          autoFocus
                        />
                        <button onClick={(e) => {
                          const input = e.target.parentElement.querySelector("input");
                          handleSaveLimit(plan.id, key, input.value);
                        }} className="rounded p-1 text-success hover:bg-success/10">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing((prev) => ({ ...prev, [editKey]: false }))} className="rounded p-1 text-muted-foreground hover:bg-muted">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{formatLimit(currentValue)}</span>
                        <button
                          onClick={() => setEditing((prev) => ({ ...prev, [editKey]: true }))}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Flags */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature Flags</p>
            <div className="space-y-2">
              {FEATURE_KEYS.map((key) => {
                const limit = getLimit(plan.id, key);
                const isEnabled = (limit?.limit_value ?? 0) >= 1;
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-foreground">{FEATURE_LABELS[key]}</span>
                    <button
                      onClick={() => handleSaveLimit(plan.id, key, !isEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${isEnabled ? "bg-success" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isEnabled ? "left-4" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing (Pro only) */}
          {isPro && planPricings.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing (INR)</p>
              <div className="space-y-2">
                {planPricings.map((p) => {
                  const editKey = `pricing_${p.id}`;
                  const isEditing = editing[editKey];
                  const cycleLabel = p.billing_cycle === "MONTHLY" ? "Monthly" : p.billing_cycle === "SIX_MONTHS" ? "6 Months" : "Annual";
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="text-sm text-foreground">{cycleLabel}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            defaultValue={p.price}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePricing(p.id, e.target.value);
                            }}
                            className="h-8 w-24 rounded border border-input bg-card px-2 text-sm text-right focus:border-primary focus:outline-none"
                            autoFocus
                          />
                          <button onClick={(e) => {
                            const input = e.target.parentElement.querySelector("input");
                            handleSavePricing(p.id, input.value);
                          }} className="rounded p-1 text-success hover:bg-success/10">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditing((prev) => ({ ...prev, [editKey]: false }))} className="rounded p-1 text-muted-foreground hover:bg-muted">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(p.price)}</span>
                          <button
                            onClick={() => setEditing((prev) => ({ ...prev, [editKey]: true }))}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Plans & Pricing" description="Configure plan limits, feature flags, and pricing. Changes apply immediately." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {freePlan && renderPlanCard(freePlan, false)}
        {proPlan && renderPlanCard(proPlan, true)}
      </div>
    </div>
  );
}