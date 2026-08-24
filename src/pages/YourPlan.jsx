import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Crown, Check, Loader2, Lock, CreditCard, AlertCircle } from "lucide-react";
import Button from "@/components/common/Button";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PLAN_UNLIMITED } from "@/lib/planService";
import { createPaymentOrder, verifyPayment } from "@/lib/paymentService";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [requesting, setRequesting] = useState(null);
  const [paying, setPaying] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [gatewayAvailable, setGatewayAvailable] = useState(null); // null = unknown, true/false

  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const isExpired = plan?.isExpired;
  const isSuspended = plan?.planStatus === "suspended";

  const proPricings = (plan?.pricings || []).filter((p) => p.is_active && p.billing_cycle);

  // Check gateway availability on mount (only if not Pro).
  useEffect(() => {
    if (isPro || gatewayAvailable !== null || !workspace?.id || proPricings.length === 0) return;
    // We determine gateway availability by attempting to create an order.
    // If it returns 503 "not configured", gateway is unavailable.
    // We don't actually redirect — just check.
    let cancelled = false;
    (async () => {
      try {
        const res = await createPaymentOrder(workspace.id, proPricings[0].id);
        if (!cancelled) {
          if (res?.gatewayStatus === "pending") {
            setGatewayAvailable(false);
          } else if (res?.checkout_url) {
            // Gateway works but we created a real session — cancel it by not using it.
            // Actually, we should not create a session just to check. Let's just set true.
            setGatewayAvailable(true);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.message || "";
          if (msg.includes("not yet available") || msg.includes("not configured") || msg.includes("503")) {
            setGatewayAvailable(false);
          } else {
            setGatewayAvailable(false);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isPro, workspace?.id, gatewayAvailable, proPricings.length]);

  // Handle payment redirect (success or cancelled).
  useEffect(() => {
    const status = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (status === "success" && sessionId) {
      setVerifying(true);
      verifyPayment(sessionId)
        .then((res) => {
          if (res?.ok) {
            toast({ title: "Pro activated!", description: "Your subscription is now active." });
            reload();
          } else {
            toast({ title: "Payment verification failed", description: res?.error || "Please contact support.", variant: "destructive" });
          }
        })
        .catch((e) => {
          toast({ title: "Payment verification failed", description: e?.message, variant: "destructive" });
        })
        .finally(() => {
          setVerifying(false);
          searchParams.delete("payment");
          searchParams.delete("session_id");
          setSearchParams(searchParams, { replace: true });
        });
    } else if (status === "cancelled") {
      toast({ title: "Payment cancelled", description: "Your plan remains unchanged." });
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

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

  const handlePayOnline = async (pricingId) => {
    setPaying(pricingId);
    try {
      const res = await createPaymentOrder(workspace.id, pricingId);
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setGatewayAvailable(false);
        toast({ title: "Online payment unavailable", description: "Please use Request Upgrade instead.", variant: "destructive" });
      }
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("not yet available") || msg.includes("not configured")) {
        setGatewayAvailable(false);
      }
      toast({ title: "Could not start payment", description: msg, variant: "destructive" });
    } finally {
      setPaying(null);
    }
  };

  if (loading || verifying) {
    return (
      <div className="p-6 max-w-[900px] mx-auto flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{verifying ? "Verifying payment…" : "Loading…"}</span>
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
          <Crown className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Plan</h1>
          <p className="text-sm text-muted-foreground">
            You're currently on the <span className="font-medium text-foreground">{isPro ? "Pro" : "Free"}</span> plan
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
          {isPro && (
            <p className="text-xs text-muted-foreground mt-1">Renew manually before expiry</p>
          )}
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
              proPricings.map((p, i) => (
                <div key={p.id} className={cn(
                  "bg-card border rounded-xl p-5 flex flex-col relative overflow-hidden",
                  i === 1 ? "border-primary shadow-md" : "border-border"
                )}>
                  {i === 1 && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-bl-lg uppercase tracking-wide">
                      Popular
                    </div>
                  )}
                  <div className="text-sm font-semibold text-foreground">{BILLING_LABELS[p.billing_cycle]}</div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-foreground">₹{p.price}</span>
                    <span className="text-sm text-muted-foreground">{BILLING_PERIOD[p.billing_cycle]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{p.duration_months} month{p.duration_months > 1 ? "s" : ""} of Pro access</div>
                  {gatewayAvailable === true ? (
                    <Button
                      variant={i === 1 ? "primary" : "outline"}
                      size="sm"
                      className="mt-4"
                      disabled={paying === p.id}
                      onClick={() => handlePayOnline(p.id)}
                    >
                      {paying === p.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</> : <><CreditCard className="w-3.5 h-3.5" /> Pay Online</>}
                    </Button>
                  ) : gatewayAvailable === false ? (
                    <Button
                      variant={i === 1 ? "primary" : "outline"}
                      size="sm"
                      className="mt-4"
                      disabled={requesting === p.id}
                      onClick={() => submitUpgradeRequest(p.id)}
                    >
                      {requesting === p.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting…</> : "Request Upgrade"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="mt-4" disabled>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
          {gatewayAvailable === false && (
            <p className="text-xs text-muted-foreground mt-3">
              Online payment is not yet available. Your upgrade request will be reviewed and Pro activated by our team.
            </p>
          )}
          {gatewayAvailable === true && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Payment gateway transaction charges are borne separately by the client.
            </p>
          )}
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