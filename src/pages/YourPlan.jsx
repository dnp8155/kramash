import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { isFreeMonthNoteVisible, getActiveLaunchOffer, FREE_MONTH_SHORT } from "@/constants/launchOffer";
import { Diya, Rangoli, Swastik } from "@/components/landing/FestiveOffer";
import { Crown, Check, CheckCircle2, Loader2, Lock, CreditCard, MessageSquare, Gift } from "lucide-react";
import Button from "@/components/common/Button";
import YourPlanSkeleton from "@/components/plan/YourPlanSkeleton";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { PLAN_UNLIMITED, comparisonLimits } from "@/lib/planService";
import { createPaymentOrder, verifyPayment, openRazorpayCheckout } from "@/lib/paymentService";
import { submitUpgradeRequest as submitUpgradeRequestFn } from "@/lib/clientEdgeFunctions";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import ProTag from "@/components/common/ProTag";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const CYCLE_ORDER = { MONTHLY: 1, SIX_MONTHS: 2, ANNUAL: 3 };
const POPULAR_CYCLE = "ANNUAL";
const BILLING_PERIOD = { MONTHLY: "/month", SIX_MONTHS: "/6 months", ANNUAL: "/year" };


export default function YourPlan() {
  const { workspace } = useWorkspace();
  const { plan, usage, loading, reload } = usePlan();
  const { toast } = useToast();
  const term = useBusinessTerminology();
  usePageTitle("Your Plan");
  const [requesting, setRequesting] = useState(null);
  // True once a request from this workspace is waiting for review (loaded on open, set after sending).
  const [requestSent, setRequestSent] = useState(false);
  // True once an earlier request from this workspace was approved: the launch offer is one-time. A rejected request does not count.
  const [offerApproved, setOfferApproved] = useState(false);
  const [paying, setPaying] = useState(null);
  const [gatewayAvailable, setGatewayAvailable] = useState(null);

  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const isExpired = plan?.isExpired;
  const isSuspended = plan?.planStatus === "suspended";
  // Expiry reads orange, and red once it is within a week.
  const daysLeft = plan?.expiresAt ? Math.ceil((new Date(plan.expiresAt) - Date.now()) / 86400000) : null;
  const expiryTone = daysLeft !== null && daysLeft <= 7 ? "text-destructive" : "text-warning";
  // Hand-picked launch users get 1 month of Pro free (admin-assigned, source PROMOTIONAL).
  const isLaunchUser = plan?.subscription?.source === "PROMOTIONAL";
  const launchEnded = isLaunchUser && !isPro;
  const renewing = isPro || launchEnded;
  // The launch offer can be used once per workspace: after a launch month or an approved request, the banner stays but its button is off.
  const offerUsed = isLaunchUser || offerApproved;
  const offer = getActiveLaunchOffer();
  // Only the Pro plan's paid options, always in Monthly → 6 Months → Yearly order.
  const proPlanId = (plan?.plans || []).find((p) => p.code === "PRO")?.id;
  const proPricings = (plan?.pricings || [])
    .filter((p) => p.is_active && CYCLE_ORDER[p.billing_cycle] && (!proPlanId || p.plan_id === proPlanId) && Number(p.price) > 0)
    .sort((a, b) => CYCLE_ORDER[a.billing_cycle] - CYCLE_ORDER[b.billing_cycle]);
  // The comparison table reads each plan's real limits, so it follows whatever the admin sets on the Plans page.
  const cmp = comparisonLimits(plan?.limitsByPlan);
  const priceLine = proPricings.map((p) => `${BILLING_LABELS[p.billing_cycle]} ₹${Number(p.price).toLocaleString("en-IN")}`).join(" · ");
  const monthlyPrice = Number(proPricings.find((p) => p.billing_cycle === "MONTHLY")?.price) || 0;

  useEffect(() => {
    if (gatewayAvailable !== null || !workspace?.id || proPricings.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await createPaymentOrder(workspace.id, proPricings[0].id, true);
        if (!cancelled) setGatewayAvailable(res?.configured ? true : false);
      } catch {
        if (!cancelled) setGatewayAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isPro, workspace?.id, gatewayAvailable, proPricings.length]);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    base44.entities.UpgradeRequest.filter({ workspace_id: workspace.id })
      .then((rows) => {
        if (cancelled) return;
        setRequestSent((rows || []).some((r) => r.status === "PENDING"));
        setOfferApproved((rows || []).some((r) => r.status === "APPROVED"));
      })
      .catch(() => { /* the button just stays available */ });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const submitUpgradeRequest = async (pricingId) => {
    if (requestSent || offerUsed) return;
    setRequesting(pricingId);
    try {
      await submitUpgradeRequestFn({ workspace_id: workspace?.id, requested_pricing_id: pricingId });
      setRequestSent(true);
      toast({ title: "Upgrade request submitted", description: "Our team will activate your Pro plan shortly." });
    } catch (e) {
      toast({ title: "Failed to submit request", description: e?.message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  const handlePayOnline = async (pricingId) => {
    if (gatewayAvailable === false) {
      toast({ title: "Online payment is opening soon", description: "Buying Pro online will be available very shortly. Meanwhile, you can request the launch offer below.", variant: "destructive" });
      return;
    }
    setPaying(pricingId);
    try {
      const res = await createPaymentOrder(workspace.id, pricingId);
      if (!res?.order_id) { setGatewayAvailable(false); toast({ title: "Online payment unavailable", description: "Please try again in a little while.", variant: "destructive" }); return; }
      const paymentResponse = await openRazorpayCheckout({ orderId: res.order_id, keyId: res.key_id, amount: res.amount, currency: res.currency, name: workspace?.name || "Kramasha", prefill: { name: workspace?.name || "", email: workspace?.email || "", contact: workspace?.phone || "" } });
      const verifyRes = await verifyPayment(paymentResponse.razorpay_order_id, paymentResponse.razorpay_payment_id, paymentResponse.razorpay_signature);
      if (verifyRes?.ok) { toast({ title: "Pro activated!", description: "Your subscription is now active." }); reload(); }
      else { toast({ title: "Payment verification failed", description: verifyRes?.error || "Please contact support.", variant: "destructive" }); }
    } catch (e) {
      const msg = e?.message || "";
      if (msg === "Payment cancelled") { toast({ title: "Payment cancelled", description: "Your plan remains unchanged." }); }
      else { toast({ title: "Payment could not be started", description: "Please try again in a little while.", variant: "destructive" }); }
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <YourPlanSkeleton />;

  const usageRows = [
    { key: "max_events", label: term.workItemPlural, current: usage?.events || 0 },
    { key: "max_team_members", label: "Team Members", current: usage?.team_members || 0 },
    { key: "max_services", label: "Services", current: usage?.services || 0 },
    { key: "max_leads", label: "Leads", current: usage?.leads || 0 }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"><Crown className="w-6 h-6 text-amber-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Plan</h1>
          <p className="text-sm text-muted-foreground">You're currently on the {isPro ? <ProTag>Pro</ProTag> : <span className="inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Free</span>} plan
            {plan?.planStatus === "active" && <span className="inline-flex items-center gap-1 text-success font-medium ml-2 align-middle"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>}
            {plan?.planStatus && !["free", "active"].includes(plan.planStatus) && !isExpired && !isSuspended && ` · ${plan.planStatus}`}
            {isExpired && <span className="text-destructive font-medium"> · Pro expired, Free limits apply</span>}
            {isSuspended && <span className="text-destructive font-medium"> · Workspace suspended</span>}
          </p>
        </div>
      </div>

      {isFreeMonthNoteVisible() && offer && (
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-[#F5A300] via-[#FF7A00] to-[#C8321E] shadow-md">
          <div className="relative overflow-hidden rounded-[14px] px-5 py-5 text-white bg-gradient-to-r from-[#7A1E12] via-[#A32A14] to-[#7A1E12]">
            <Rangoli className="absolute -left-4 -top-4 w-16 h-16 opacity-70" />
            <Rangoli className="absolute -right-4 -bottom-4 w-16 h-16 opacity-70" />
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold tracking-wide text-[#FFD36B]">{offer.copy.blessing}</div>
                <h4 className="mt-1.5 flex flex-wrap items-center justify-center gap-2 font-heading text-lg sm:text-xl font-semibold text-[#FFE9A6]">
                  <Swastik className="w-5 h-5 shrink-0" />
                  <span>{offer.copy.title}: your first month of Pro free</span>
                  <Diya className="w-8 h-8 shrink-0" />
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-white/90 leading-relaxed">
                  {FREE_MONTH_SHORT}. Tap the button and our team will review your request. If you're selected, Pro goes live free for 1 month and we'll let you know. After that, continue with any plan above, or stay on Free. No auto-charge.
                </p>
                {requestSent && <p className="mt-2 text-xs font-medium text-[#FFE9A6]">We've got your request. We'll review it and let you know.</p>}
                {!requestSent && offerUsed && <p className="mt-2 text-xs font-medium text-[#FFE9A6]">You've already used the launch offer. You can still renew with any plan below.</p>}
                <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-black/25 border border-[#FFD36B]/50 px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#FFE9A6]">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  {offer.daysLeft <= 1 ? "Last day of the offer" : `${offer.daysLeft} days left`}
                </div>
              </div>
              <button
                type="button"
                disabled={!proPricings[0] || requesting === proPricings[0]?.id || requestSent || offerUsed}
                onClick={() => submitUpgradeRequest(proPricings[0].id)}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-full bg-[#FFD36B] text-[#5A1508] text-sm font-semibold hover:bg-[#FFE08F] transition-colors disabled:opacity-70"
              >
                {requesting === proPricings[0]?.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting…</> : requestSent ? <><Check className="w-3.5 h-3.5" /> Request sent</> : offerUsed ? <><Check className="w-3.5 h-3.5" /> Offer used</> : renewing ? "Request Renewal" : "Request Upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLaunchUser && (isPro || launchEnded) && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {isPro ? "You're on your free launch month" : "Your free launch month has ended"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isPro && plan?.expiresAt ? `Pro is free for you until ${formatDate(String(plan.expiresAt).slice(0, 10))}. ` : ""}
              {priceLine ? `To continue with Pro afterwards: ${priceLine}.` : ""} Thank you for being one of our first users — your feedback or a review means a lot.
            </p>
          </div>
          <Link to="/help" state={{ feedback: true }} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-muted whitespace-nowrap">
            <MessageSquare className="w-3.5 h-3.5" /> Share feedback / review
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-[15px] p-5">
          <h3 className="text-sm font-semibold mb-3">Current Plan</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{isPro ? "Pro" : "Free"}</span>
            {isPro && plan?.expiresAt && <span className={cn("text-sm font-medium ml-2", expiryTone)}>expires {formatDate(String(plan.expiresAt).slice(0, 10))}</span>}
          </div>
          {isPro && <p className="text-xs text-muted-foreground mt-1">Renew manually before expiry</p>}
          <div className="mt-3 space-y-1">
            {usageRows.map((u) => {
              const limit = plan?.limits?.[u.key];
              const display = limit >= PLAN_UNLIMITED ? "Unlimited" : limit;
              return (<div key={u.key} className="flex justify-between text-sm"><span className="text-muted-foreground">{u.label}</span><span className={cn("font-medium", limit < PLAN_UNLIMITED && u.current >= limit && "text-destructive")}>{u.current} / {display}</span></div>);
            })}
          </div>
        </div>
        <div className="bg-card border border-border rounded-[15px] p-5">
          <h3 className="text-sm font-semibold mb-3">Features</h3>
          <ul className="space-y-2">
            <FeatureRow label="Reminders (in-app)" enabled={true} />
            <FeatureRow label="Quotations & Invoices" enabled={true} />
            <FeatureRow label="PDF Export" enabled={true} />
            <FeatureRow label="Public Profile URL" enabled={true} />
            <FeatureRow label="App Lock" enabled={true} />
            <FeatureRow label="Data Export (Preferences)" enabled={true} />
            <FeatureRow label="Excel/CSV Export" enabled={!!plan?.limits?.excel_csv_export_enabled} />
            <FeatureRow label="Notifications" enabled={!!plan?.limits?.notifications_enabled} />
            <FeatureRow label="Link Sharing (quotation, invoice, event)" enabled={!!plan?.limits?.link_sharing_enabled} />
            <FeatureRow label="Client Portal" enabled={!!plan?.limits?.client_portal_enabled} />
            <FeatureRow label="Team Portal" enabled={!!plan?.limits?.team_portal_enabled} />
            <FeatureRow label="Night & Pastel Themes" enabled={!!plan?.limits?.advanced_theme_enabled} />
            <FeatureRow label="Event Display & Logo on Invoice" enabled={!!plan?.limits?.event_display_customization_enabled} />
            <FeatureRow label="Quotation Logo" enabled={!!plan?.limits?.quotation_logo_enabled} />
            <FeatureRow label="WhatsApp sharing & message templates" enabled={true} />
            <FeatureRow label="Email clients from your Gmail (send, schedule, automatic)" enabled={!!plan?.limits?.client_email_enabled} />
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1">{renewing ? "Renew / Extend Pro" : "Upgrade to Pro"}</h3>
        <div className="mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {proPricings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pro pricing not configured yet. Please contact support.</p>
          ) : (
            proPricings.map((p) => {
              const popular = p.billing_cycle === POPULAR_CYCLE;
              const months = p.duration_months || 1;
              const perMonth = Math.round(Number(p.price) / months);
              const savePct = monthlyPrice && months > 1 ? Math.round((1 - Number(p.price) / (monthlyPrice * months)) * 100) : 0;
              return (
                <div key={p.id} className={cn("bg-card border rounded-[15px] p-5 flex flex-col relative overflow-hidden", popular ? "border-primary shadow-md ring-1 ring-primary/30" : "border-border")}>
                  {popular && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-bl-lg uppercase tracking-wide">Most Popular</div>}
                  <div className="text-sm font-semibold text-foreground">{BILLING_LABELS[p.billing_cycle]}</div>
                  <div className="flex items-baseline gap-1 mt-2"><span className="text-3xl font-bold text-foreground">₹{Number(p.price).toLocaleString("en-IN")}</span><span className="text-sm text-muted-foreground">{BILLING_PERIOD[p.billing_cycle]}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{months} month{months > 1 ? "s" : ""} of Pro access</div>
                  <div className="text-xs mt-1 h-4">{months > 1 && <span className="text-muted-foreground">₹{perMonth}/month{savePct > 0 && <span className="ml-1.5 font-semibold text-success">Save {savePct}%</span>}</span>}</div>
                  <Button variant={popular ? "primary" : "outline"} size="sm" className="mt-4" disabled={paying === p.id} onClick={() => handlePayOnline(p.id)}>
                    {paying === p.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</> : <><CreditCard className="w-3.5 h-3.5" /> {renewing ? "Renew" : "Buy"}</>}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-[15px] p-5">
        <h3 className="text-sm font-semibold mb-3">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1.5 font-medium">Feature</th><th className="py-1.5 font-medium text-center">Free</th><th className="py-1.5 font-medium text-center">Pro</th></tr></thead>
            <tbody>
              <CompareRow label={term.workItemPlural} free={cmp.free.max_events} pro={cmp.pro.max_events} />
              <CompareRow label="Team Members" free={cmp.free.max_team_members} pro={cmp.pro.max_team_members} />
              <CompareRow label="Services" free={cmp.free.max_services} pro={cmp.pro.max_services} />
              <CompareRow label="Leads" free={cmp.free.max_leads} pro={cmp.pro.max_leads} />
              <CompareRow label="Quotation & Invoice creation" free={true} pro={true} />
              <CompareRow label="PDF Export" free={cmp.free.pdf_export_enabled} pro={cmp.pro.pdf_export_enabled} />
              <CompareRow label="Reminders (in-app)" free={true} pro={true} />
              <CompareRow label="Public Profile URL" free={true} pro={true} />
              <CompareRow label="App Lock" free={true} pro={true} />
              <CompareRow label="Data Export (Preferences)" free={true} pro={true} />
              <CompareRow label="WhatsApp sharing & message templates" free={true} pro={true} />
              <CompareRow label="Excel/CSV Export" free={cmp.free.excel_csv_export_enabled} pro={cmp.pro.excel_csv_export_enabled} />
              <CompareRow label="Notifications" free={cmp.free.notifications_enabled} pro={cmp.pro.notifications_enabled} />
              <CompareRow label="Link Sharing (quotation, invoice, event)" free={cmp.free.link_sharing_enabled} pro={cmp.pro.link_sharing_enabled} />
              <CompareRow label="Client Portal" free={cmp.free.client_portal_enabled} pro={cmp.pro.client_portal_enabled} />
              <CompareRow label="Team Portal" free={cmp.free.team_portal_enabled} pro={cmp.pro.team_portal_enabled} />
              <CompareRow label="Night & Pastel Themes" free={cmp.free.advanced_theme_enabled} pro={cmp.pro.advanced_theme_enabled} />
              <CompareRow label="Event Display & Logo on Invoice" free={cmp.free.event_display_customization_enabled} pro={cmp.pro.event_display_customization_enabled} />
              <CompareRow label="Quotation Logo" free={cmp.free.quotation_logo_enabled} pro={cmp.pro.quotation_logo_enabled} />
              <CompareRow label="Email clients from your Gmail (send, schedule, automatic)" free={cmp.free.client_email_enabled} pro={cmp.pro.client_email_enabled} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (<li className="flex items-center gap-2 text-sm">{enabled ? <Check className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}<span className={enabled ? "text-foreground" : "text-muted-foreground"}>{label}</span></li>);
}

function CompareRow({ label, free, pro }) {
  const fmt = (v) => { if (v === true) return <Check className="w-4 h-4 text-success mx-auto" />; if (v === false) return <span className="text-muted-foreground">—</span>; if (typeof v === "number") return v >= PLAN_UNLIMITED ? "Unlimited" : v; return v; };
  return (<tr className="border-t border-border"><td className="py-1.5">{label}</td><td className="py-1.5 text-center">{fmt(free)}</td><td className="py-1.5 text-center font-medium">{fmt(pro)}</td></tr>);
}