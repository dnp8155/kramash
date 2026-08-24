import { useState, useEffect } from "react";
import { Crown, Check, Loader2, Lock } from "lucide-react";
import Button from "@/components/common/Button";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PLAN_UNLIMITED } from "@/lib/planService";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };
const BILLING_PERIOD = { MONTHLY: "/month", SIX_MONTHS: "/6 months", ANNUAL: "/year" };

const LIMIT_LABELS = {
  max_events: "Events",
  max_team_members: "Team Members",
  max_services: "Services",
  pdf_export_enabled: "PDF Export",
  reminders_enabled: "Reminders"
};

export default function YourPlan() {
  const { workspace } = useWorkspace();
  const { plan, usage, loading, reload } = usePlan();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(null);

  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const isExpired = plan?.isExpired;
  const isSuspended = plan?.planStatus === "suspended";

  const proPricings = (plan?.pricings || []).filter((p) => p.is_active && p.billing_cycle);

  const submitUpgradeRequest = async (pricingId) => {
    setRequesting(pricingId);
    try {
      await base44.functions.invoke("submitUpgradeRequest", {
        workspace_id: workspace?.id,
        requested_pricing_id: pricingId
      });
      toast({ title: "Upgrade request submitted", description: "Our team will activate your Pro plan shortly." });
    } catch (e) {
      toast({ title: "Failed to submit request", description: e?.message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-[900px] mx-auto flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usageRows = [
    { key: "max_events", label: "Events", current: usage?.events || 0 },
    { key: "max_team_members", label: "Team Members", current: usage?.team_members || 0 },
    { key: "max_services", label: "Services", current: usage?.services || 0 }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your Plan</h2>
          <p className="text-sm text-muted-foreground">
            You're currently on the <span className="font-medium">{isPro ? "Pro" : "Free"}</span> plan
            {plan?.planStatus && plan.planStatus !== "free" && ` · ${plan.planStatus}`}
            {isExpired && " · Pro expired, Free limits apply"}
            {isSuspended && " · Workspace suspended"}
          </p>
        </div>
      </div>

      {/* Current plan summary + usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Current Plan</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{isPro ? "Pro" : "Free"}</span>
            {isPro && plan?.expiresAt && (
              <span className="text-sm text-muted-foreground ml-2">expires {new Date(plan.expiresAt).toLocaleDateString()}</span>
            )}
          </div>
          <div className="mt-3 space-y-1">
            {usageRows.map((u) => {
              const limit = plan?.limits?.[u.key];
              const display = limit >= PLAN_UNLIMITED ? "Unlimited" : limit;
              return (
                <div key={u.key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{u.label}</span>
                  <span className={cn("font-medium", limit < PLAN_UNLIMITED && u.current >= limit && "text-destructive")}>
                    {u.current} / {display}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Features</h3>
          <ul className="space-y-2">
            <FeatureRow label="PDF Export" enabled={!!plan?.limits?.pdf_export_enabled} />
            <FeatureRow label="Reminders" enabled={!!plan?.limits?.reminders_enabled} />
            <FeatureRow label="Quotations & GST" enabled={true} />
            <FeatureRow label="Payment Tracking" enabled={true} />
          </ul>
        </div>
      </div>

      {/* Pro pricing / upgrade */}
      {!isPro && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Upgrade to Pro</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {proPricings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pro pricing not configured yet. Please contact support.</p>
            ) : (
              proPricings.map((p) => (
                <div key={p.id} className="bg-card border border-primary/30 rounded-lg p-5 flex flex-col">
                  <div className="text-sm font-medium">{BILLING_LABELS[p.billing_cycle]}</div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold">₹{p.price}</span>
                    <span className="text-sm text-muted-foreground">{BILLING_PERIOD[p.billing_cycle]}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    disabled={requesting === p.id}
                    onClick={() => submitUpgradeRequest(p.id)}
                  >
                    {requesting === p.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting…</> : "Request Upgrade"}
                  </Button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Online payment is coming soon. Your request will be reviewed and Pro activated by our team.
          </p>
        </div>
      )}

      {/* Free vs Pro comparison */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Feature</th>
                <th className="py-1.5 font-medium text-center">Free</th>
                <th className="py-1.5 font-medium text-center">Pro</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Events" free={plan?.limits?.max_events} pro="Unlimited" />
              <CompareRow label="Team Members" free={plan?.limits?.max_team_members} pro="Up to 50" />
              <CompareRow label="Services" free={plan?.limits?.max_services} pro="Unlimited" />
              <CompareRow label="PDF Export" free={false} pro={true} />
              <CompareRow label="Reminders" free={false} pro={true} />
              <CompareRow label="Quotations & GST" free={true} pro={true} />
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Billing and payment gateway integration will be available in a future phase.
      </p>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {enabled ? <Check className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
      <span className={enabled ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function CompareRow({ label, free, pro }) {
  const fmt = (v) => {
    if (v === true) return <Check className="w-4 h-4 text-success mx-auto" />;
    if (v === false) return <span className="text-muted-foreground">—</span>;
    if (typeof v === "number") return v >= PLAN_UNLIMITED ? "Unlimited" : v;
    return v;
  };
  return (
    <tr className="border-t border-border">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-center">{fmt(free)}</td>
      <td className="py-1.5 text-center font-medium">{fmt(pro)}</td>
    </tr>
  );
}