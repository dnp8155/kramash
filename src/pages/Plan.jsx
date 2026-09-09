import { useState } from "react";
import { Check, Sparkles, Crown, Loader2, TrendingUp } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import LoadingState from "@/components/common/LoadingState";
import { usePlan } from "@/lib/PlanContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlans } from "@/hooks/usePlans";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate } from "@/utils/format";
import { RESOURCE_LABELS, formatLimit, UNLIMITED } from "@/utils/plan";
import { toast } from "@/components/ui/use-toast";

const FREE_FEATURES = [
  { key: "max_events", label: "Up to 5 events" },
  { key: "max_team_members", label: "Up to 3 team members" },
  { key: "max_services", label: "Up to 5 services" },
  { key: "quotation_enabled", label: "Basic quotations" },
  { key: "pdf_export_enabled", label: "PDF export" },
  { key: "reminders_enabled", label: "Reminders" },
];

const PRO_FEATURES = [
  { key: "max_events", label: "Unlimited events" },
  { key: "max_team_members", label: "Unlimited team members" },
  { key: "max_services", label: "Unlimited services" },
  { key: "quotation_enabled", label: "GST-enabled quotations" },
  { key: "pdf_export_enabled", label: "Branded PDF export" },
  { key: "reminders_enabled", label: "Payment reminders" },
  { key: "advanced_theme_enabled", label: "Advanced themes" },
];

export default function Plan() {
  const { plan, planCode, planName, subscription, subscriptionStatus, expiresAt, usage, limits, isPro, isExpired, loading, refresh } = usePlan();
  const { workspaceId } = useWorkspace();
  const { plans, pricings, loading: plansLoading } = usePlans();
  const [upgradeModal, setUpgradeModal] = useState(null); // pricing object or null
  const [requesting, setRequesting] = useState(false);

  const proPlan = plans.find((p) => p.code === "PRO");
  const freePlan = plans.find((p) => p.code === "FREE");
  const proPricings = pricings.filter((p) => proPlan && p.plan_id === proPlan.id && p.is_active);

  const handleRequestUpgrade = async () => {
    if (!upgradeModal || !proPlan) return;
    setRequesting(true);
    try {
      await base44.entities.UpgradeRequest.create({
        workspace_id: workspaceId,
        requested_plan_id: proPlan.id,
        requested_pricing_id: upgradeModal.id,
        status: "PENDING",
        requested_at: new Date().toISOString().slice(0, 10),
      });
      toast({ title: "Upgrade request submitted", description: "The Kramashah team will review your request and activate Pro shortly." });
      setUpgradeModal(null);
    } catch (e) {
      toast({ title: "Request failed", description: e?.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading || plansLoading) return <LoadingState label="Loading your plan…" />;

  const usageItems = [
    { key: "events", label: "Events", limitKey: "max_events", current: usage.events },
    { key: "team_members", label: "Team Members", limitKey: "max_team_members", current: usage.team_members },
    { key: "services", label: "Services", limitKey: "max_services", current: usage.services },
  ];

  const cycleLabel = (cycle) =>
    cycle === "MONTHLY" ? "month" : cycle === "SIX_MONTHS" ? "6 months" : "year";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Your Plan" description="Manage your subscription and billing." />

      {/* Current Plan Banner */}
      <Card className={isPro ? "border-warning/30 bg-warning/5" : "border-primary/30 bg-accent/40"}>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${isPro ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"}`}>
              {isPro ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You're on the {planName} plan{isExpired ? " (expired)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPro && expiresAt
                  ? `Active until ${formatDate(expiresAt)}`
                  : isPro
                  ? "Active subscription"
                  : "Free plan — no expiry"}
              </p>
            </div>
          </div>
          {!isPro && (
            <Button onClick={() => setUpgradeModal(proPricings[0] || {})}>Upgrade Plan</Button>
          )}
        </CardBody>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader><CardTitle>Current Usage</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {usageItems.map((item) => {
              const limit = limits[item.limitKey];
              const isUnlimited = limit >= UNLIMITED;
              const pct = isUnlimited ? 0 : limit > 0 ? Math.min(100, (item.current / limit) * 100) : 100;
              const isAtLimit = !isUnlimited && item.current >= limit;
              return (
                <div key={item.key} className="rounded-lg border border-border bg-accent/20 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {isAtLimit && <span className="text-xs font-semibold text-destructive">Limit reached</span>}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {item.current}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" / "}{isUnlimited ? "∞" : (limit ?? 0)}
                    </span>
                  </p>
                  {!isUnlimited && limit > 0 && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Pro Pricing */}
      {!isPro && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">Upgrade to Kramashah Pro</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {proPricings.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {p.billing_cycle === "MONTHLY" ? "Monthly" : p.billing_cycle === "SIX_MONTHS" ? "6 Months" : "Annual"}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{formatCurrency(p.price)}</span>
                      <span className="text-sm text-muted-foreground">/ {cycleLabel(p.billing_cycle)}</span>
                    </div>
                  </div>
                  <Button className="w-full mt-auto" onClick={() => setUpgradeModal(p)}>
                    Request Upgrade
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Online payment is coming soon. For now, your upgrade request will be reviewed by the Kramashah team.
          </p>
        </div>
      )}

      {/* Free vs Pro Comparison */}
      <Card>
        <CardHeader><CardTitle>Plan Comparison</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-5 py-3 font-semibold text-center">Free</th>
                  <th className="px-5 py-3 font-semibold text-center">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PRO_FEATURES.map((f) => {
                  const freeLimit = limits[f.key];
                  const proLimit = limits[f.key];
                  const freeEnabled = f.key.startsWith("max_")
                    ? formatLimit(freeLimit) !== "—"
                    : (freeLimit ?? 0) >= 1;
                  const freeLabel = f.key.startsWith("max_")
                    ? `Up to ${freeLimit ?? 0}`
                    : freeEnabled ? "Yes" : "No";
                  const proLabel = f.key.startsWith("max_")
                    ? "Unlimited"
                    : "Yes";
                  return (
                    <tr key={f.key}>
                      <td className="px-5 py-3 text-foreground">{f.label}</td>
                      <td className="px-5 py-3 text-center text-muted-foreground">{freeLabel}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-medium text-warning">
                          <Check className="h-3.5 w-3.5" /> {proLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Upgrade Request Modal */}
      <Modal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        title="Request Pro Upgrade"
        size="sm"
      >
        {upgradeModal && (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Kramashah Pro</p>
                  <p className="text-xs text-muted-foreground">
                    {upgradeModal.billing_cycle === "MONTHLY" ? "Monthly" : upgradeModal.billing_cycle === "SIX_MONTHS" ? "6 Months" : "Annual"} — {formatCurrency(upgradeModal.price)} / {cycleLabel(upgradeModal.billing_cycle)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your upgrade request will be submitted to the Kramashah team for review. Once approved, Pro will be activated for your workspace.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpgradeModal(null)}>Cancel</Button>
              <Button onClick={handleRequestUpgrade} disabled={requesting}>
                {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />} Submit Request
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}