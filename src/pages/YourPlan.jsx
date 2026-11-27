import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { isFreeMonthNoteVisible, getActiveLaunchOffer, getGiftRequestCampaign, FREE_MONTH_SHORT } from "@/constants/launchOffer";
import { Diya, Rangoli, Swastik } from "@/components/landing/FestiveOffer";
import { Crown, Check, CheckCircle2, Loader2, Lock, CreditCard, MessageSquare, Gift, RefreshCw } from "lucide-react";
import Button from "@/components/common/Button";
import YourPlanSkeleton from "@/components/plan/YourPlanSkeleton";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatDate, todayISO } from "@/lib/dates";
import { renewalWindow, addMonthsIso } from "@/lib/planRenewal";
import { PLAN_UNLIMITED, comparisonLimits } from "@/lib/planService";
import { createPaymentOrder, verifyPayment, openRazorpayCheckout } from "@/lib/paymentService";
import { submitUpgradeRequest as submitUpgradeRequestFn, freeMonthUsed } from "@/lib/clientEdgeFunctions";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { checkAppVersion, applyAppUpdateForPayment, UPDATED_FOR_PAYMENT_KEY } from "@/hooks/usePWA";
import ProTag from "@/components/common/ProTag";
import PaymentHistory from "@/components/plan/PaymentHistory";
import PaymentResultDialog from "@/components/plan/PaymentResultDialog";
import PlanValidityCard from "@/components/plan/PlanValidityCard";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const CYCLE_ORDER = { MONTHLY: 1, SIX_MONTHS: 2, ANNUAL: 3 };
const POPULAR_CYCLE = "ANNUAL";
const BILLING_PERIOD = { MONTHLY: "/month", SIX_MONTHS: "/6 months", ANNUAL: "/year" };


export default function YourPlan() {
  const { workspace } = useWorkspace();
  const { plan, usage, loading, reload, refreshFromServer } = usePlan();
  // Always show today's prices: fetch fresh ones when the page opens and whenever the app comes back to the front
  // (prices edited in Admin → Plans used to show only after the app was closed and reopened).
  useEffect(() => {
    refreshFromServer();
    const onVisible = () => { if (document.visibilityState === "visible") refreshFromServer(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const { toast } = useToast();
  const term = useBusinessTerminology();
  usePageTitle("Your Plan");
  useEffect(() => {
    let updated = false;
    try { updated = sessionStorage.getItem(UPDATED_FOR_PAYMENT_KEY) === "1"; sessionStorage.removeItem(UPDATED_FOR_PAYMENT_KEY); } catch { /* ignore */ }
    if (updated) toast({ title: "Kramasha is up to date", description: "You can continue with your plan now." });
  }, []);
  // Newest app before paying: checked quietly when the page opens (and again while a new version is still arriving).
  const [appVersion, setAppVersion] = useState("latest");
  const [updatingApp, setUpdatingApp] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const run = async () => {
      const v = await checkAppVersion();
      if (!alive) return;
      setAppVersion(v);
      if (v === "downloading") timer = window.setTimeout(run, 4000);
    };
    run();
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);
  const needsAppUpdate = appVersion !== "latest";
  const updateApp = async () => {
    setUpdatingApp(true);
    await applyAppUpdateForPayment();
  };
  const [requesting, setRequesting] = useState(null);
  // True once a request from this workspace is waiting for review (loaded on open, set after sending).
  const [requestSent, setRequestSent] = useState(false);
  // True once this workspace has ever been given Pro free (gift or launch month): one free month per workspace.
  const [freeMonthHad, setFreeMonthHad] = useState(false);
  const [paying, setPaying] = useState(null);
  // The screen shown when a payment ends without Pro (cancelled, failed, or paid but not yet confirmed).
  const [payResult, setPayResult] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [gatewayAvailable, setGatewayAvailable] = useState(null);

  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const isExpired = plan?.isExpired;
  const isSuspended = plan?.planStatus === "suspended";
  // Hand-picked launch users get 1 month of Pro free (admin-assigned, source PROMOTIONAL).
  const isLaunchUser = plan?.subscription?.source === "PROMOTIONAL";
  const launchEnded = isLaunchUser && !isPro;
  // An expired Pro is "renewed" too, so the plan cards and the validity card say the same thing.
  const renewing = isPro || launchEnded || isExpired;
  // Paid Pro renews only in its last 30 days (prices may change); until then the page just says until when it runs.
  // Only a live (ACTIVE) subscription counts: an exempt admin account can be showing an old cancelled row.
  const liveSub = String(plan?.subscription?.status || "ACTIVE").toUpperCase() === "ACTIVE";
  const renewal = liveSub ? renewalWindow({ isPro, expiresAt: plan?.expiresAt, source: plan?.subscription?.source, today: todayISO() }) : null;
  const renewNotOpen = !!renewal?.tooEarly;
  // The launch offer can be used once per workspace: after a launch month or an approved request, the banner stays but its button is off.
  const offerUsed = isLaunchUser || freeMonthHad;
  const offer = getActiveLaunchOffer();
  // After the festival offer: the plain free-month request box, only while GIFT_REQUESTS is switched on.
  // Hidden while on Pro (paid or gifted) or suspended: there is nothing to request then.
  const giftCampaign = offer || isPro || isSuspended ? null : getGiftRequestCampaign();
  // Only the Pro plan's paid options, always in Monthly → 6 Months → Yearly order.
  const proPlanId = (plan?.plans || []).find((p) => p.code === "PRO")?.id;
  const proPricings = (plan?.pricings || [])
    .filter((p) => p.is_active && CYCLE_ORDER[p.billing_cycle] && (!proPlanId || p.plan_id === proPlanId) && Number(p.price) > 0)
    .sort((a, b) => CYCLE_ORDER[a.billing_cycle] - CYCLE_ORDER[b.billing_cycle]);
  // The comparison table reads each plan's real limits, so it follows whatever the admin sets on the Plans page.
  const cmp = comparisonLimits(plan?.limitsByPlan);
  // Pro is sold in Indian rupees only (owner's decision, 21 Nov 2026), with Indian digit grouping.
  const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
  const priceLine = proPricings.map((p) => `${BILLING_LABELS[p.billing_cycle]} ${money(p.price)}`).join(" · ");
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
      })
      .catch(() => { /* the button just stays available */ });
    freeMonthUsed(workspace.id)
      .then((used) => { if (!cancelled) setFreeMonthHad(used); })
      .catch(() => { /* submitUpgradeRequest checks again before sending */ });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const submitUpgradeRequest = async (pricingId) => {
    if (requestSent || offerUsed || isPro || isSuspended) return;
    setRequesting(pricingId);
    try {
      await submitUpgradeRequestFn({ workspace_id: workspace?.id, requested_pricing_id: pricingId });
      setRequestSent(true);
      toast({ title: "Request sent", description: "Our team will review it and let you know." });
    } catch (e) {
      toast({ title: "Failed to submit request", description: e?.message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  // The line under "Kramasha" in the Razorpay window: which plan, how long, and until when Pro will run
  // (the new period starts after the current Pro end, or today on Free / after Pro ended — same as the server).
  const checkoutLine = (pricingId) => {
    const p = proPricings.find((x) => x.id === pricingId);
    if (!p) return "Kramasha Pro";
    const months = p.duration_months || 1;
    // Free / expired: the server starts the period on its (UTC) date, so use the same one here.
    const until = addMonthsIso(renewal?.end || new Date().toISOString().slice(0, 10), months);
    return `Kramasha Pro · ${months === 12 ? "1 year" : `${months} month${months > 1 ? "s" : ""}`} · Pro until ${formatDate(until)}`;
  };

  const handlePayOnline = async (pricingId) => {
    if (paying || isSuspended) return; // one payment at a time; a suspended workspace can't buy
    if (gatewayAvailable === false) {
      toast({ title: "Online payment opens soon", description: "Nothing has been charged." });
      return;
    }
    setPaying(pricingId);
    // Phase 0: only on the newest app (a last check, in case a version came out while the page was open).
    const version = await checkAppVersion();
    if (version !== "latest") {
      setAppVersion(version);
      setPaying(null);
      toast({ title: "Update Kramasha first", description: "A newer version of the app is available. Update it, then continue. Nothing has been charged." });
      return;
    }
    // Phase 1: open the order and the Razorpay window. Nothing has been charged if this part fails or is closed.
    let paymentResponse;
    try {
      const res = await createPaymentOrder(workspace.id, pricingId);
      if (!res?.order_id) { setGatewayAvailable(false); setPaying(null); toast({ title: "Online payment unavailable", description: "Please try again in a little while.", variant: "destructive" }); return; }
      paymentResponse = await openRazorpayCheckout({ orderId: res.order_id, keyId: res.key_id, amount: res.amount, currency: res.currency, description: checkoutLine(pricingId), prefill: { name: workspace?.name || "", email: workspace?.email || "", contact: workspace?.phone || "" } });
    } catch (e) {
      if ((e?.message || "") === "Payment cancelled") setPayResult({ kind: "cancelled", pricingId });
      else if (e?.data?.renewal_opens_on) {
        // Renewal isn't open yet (e.g. a page left open from before): say when it opens and refresh the plan.
        toast({ title: "Renewal isn't open yet", description: e.message });
        refreshFromServer?.();
      } else toast({ title: "Payment could not be started", description: "Please try again in a little while.", variant: "destructive" });
      setPaying(null);
      return;
    }
    // Phase 2: Razorpay says it was paid, so confirm it with our server. If that call fails the money may still have
    // moved, and the webhook activates Pro on its own, so the message says to wait rather than to pay again.
    try {
      const verifyRes = await verifyPayment(paymentResponse.razorpay_order_id, paymentResponse.razorpay_payment_id, paymentResponse.razorpay_signature);
      if (verifyRes?.ok) { reload(); setHistoryKey((k) => k + 1); }
      else setPayResult({ kind: "failed", pricingId, paymentId: paymentResponse.razorpay_payment_id, detail: verifyRes?.error });
    } catch {
      setPayResult({ kind: "unconfirmed", pricingId, paymentId: paymentResponse.razorpay_payment_id });
    } finally {
      setPaying(null);
      setHistoryKey((k) => k + 1);
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
        <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center"><Crown className="w-6 h-6 text-warning" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Plan</h1>
          <p className="text-sm text-muted-foreground">You're currently on the {isPro ? <ProTag>Pro</ProTag> : <span className="inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Free</span>} plan
            {plan?.planStatus === "active" && <span className="inline-flex items-center gap-1 text-success font-medium ml-2 align-middle"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>}
            {plan?.planStatus && !["free", "active"].includes(plan.planStatus) && !isExpired && !isSuspended && ` · ${plan.planStatus.charAt(0).toUpperCase()}${plan.planStatus.slice(1)}`}
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
                  {FREE_MONTH_SHORT}. Tap the button and our team will review your request. If you're selected, Pro goes live free for 1 month and we'll let you know. After that, continue with any plan below, or stay on Free. No auto-charge.
                </p>
                {requestSent && <p className="mt-2 text-xs font-medium text-[#FFE9A6]">We've got your request. We'll review it and let you know.</p>}
                {!requestSent && offerUsed && <p className="mt-2 text-xs font-medium text-[#FFE9A6]">A free month has already been used or reviewed for this workspace. You can continue with any plan below.</p>}
                <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-black/25 border border-[#FFD36B]/50 px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#FFE9A6]">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  {offer.daysLeft <= 1 ? "Last day of the offer" : `${offer.daysLeft} days left`}
                </div>
              </div>
              <button
                type="button"
                disabled={!proPricings[0] || requesting === proPricings[0]?.id || requestSent || offerUsed || isPro || isSuspended}
                onClick={() => submitUpgradeRequest(proPricings[0].id)}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-full bg-[#FFD36B] text-[#5A1508] text-sm font-semibold hover:bg-[#FFE08F] transition-colors disabled:opacity-70"
              >
                {requesting === proPricings[0]?.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting…</> : requestSent ? <><Check className="w-3.5 h-3.5" /> Request sent</> : offerUsed ? <><Check className="w-3.5 h-3.5" /> Offer used</> : isPro ? <><Check className="w-3.5 h-3.5" /> You're on Pro</> : "Request my free month"}
              </button>
            </div>
          </div>
        </div>
      )}

      {giftCampaign && (
        <div className="rounded-[15px] border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Gift className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{giftCampaign.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{giftCampaign.text}</p>
            {requestSent && <p className="mt-1.5 text-xs font-medium text-primary">We've got your request. We'll review it and let you know.</p>}
            {!requestSent && offerUsed && <p className="mt-1.5 text-xs font-medium text-muted-foreground">A free month has already been used or reviewed for this workspace. You can continue with any plan below.</p>}
          </div>
          <Button
            size="sm"
            className="shrink-0"
            disabled={!proPricings[0] || requesting === proPricings[0]?.id || requestSent || offerUsed}
            onClick={() => submitUpgradeRequest(proPricings[0].id)}
          >
            {requesting === proPricings[0]?.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting…</> : requestSent ? <><Check className="w-3.5 h-3.5" /> Request sent</> : offerUsed ? <><Check className="w-3.5 h-3.5" /> Already used</> : "Request my free month"}
          </Button>
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
          </div>

          <div className="mt-3 space-y-1">
            {usageRows.map((u) => {
              const limit = plan?.limits?.[u.key];
              const display = limit >= PLAN_UNLIMITED ? "Unlimited" : limit;
              return (<div key={u.key} className="flex justify-between text-sm"><span className="text-muted-foreground">{u.label}</span><span className={cn("font-medium", limit < PLAN_UNLIMITED && u.current >= limit && "text-destructive")}>{u.current} / {display}</span></div>);
            })}
          </div>

          {/* How long Pro lasts (paid, assigned or launch month), in the space under the usage rows. Also shown after
              Pro ended, until a new plan starts. */}
          {plan?.subscription?.expires_at && !isSuspended && (
            <div className="mt-5 pt-5 border-t border-border">
              <PlanValidityCard bare subscription={plan.subscription} onRenewClick={renewNotOpen ? undefined : () => document.getElementById("plan-options")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-[15px] p-5">
          <h3 className="text-sm font-semibold mb-3">Features</h3>
          {/* Included features first, then the locked ones (the order inside each group stays as listed). */}
          <ul className="space-y-2">
            {sortIncludedFirst([
              { label: "Reminders (in-app)", enabled: true },
              { label: "Quotations & Invoices", enabled: true },
              { label: "PDF Export", enabled: true },
              { label: "Public Profile URL", enabled: true },
              { label: "App Lock", enabled: true },
              { label: "Import & Export (Preferences)", enabled: true },
              { label: "WhatsApp sharing & message templates", enabled: true },
              { label: "Work from others (jobs other businesses book you for)", enabled: true },
              { label: "Excel/CSV Export", enabled: !!plan?.limits?.excel_csv_export_enabled },
              { label: "Notifications", enabled: !!plan?.limits?.notifications_enabled },
              { label: `Link Sharing (quotation, invoice, ${term.workItemSingular.toLowerCase()})`, enabled: !!plan?.limits?.link_sharing_enabled },
              { label: "Client Portal", enabled: !!plan?.limits?.client_portal_enabled },
              { label: "Team Portal", enabled: !!plan?.limits?.team_portal_enabled },
              { label: "Track (work progress for clients)", enabled: !!plan?.limits?.client_portal_enabled },
              { label: "Night & Pastel Themes", enabled: !!plan?.limits?.advanced_theme_enabled },
              { label: `${term.workItemSingular} Display & Logo on Invoice`, enabled: !!plan?.limits?.event_display_customization_enabled },
              { label: "Quotation Logo", enabled: !!plan?.limits?.quotation_logo_enabled },
              { label: "Email clients from your Gmail (send, schedule, automatic)", enabled: !!plan?.limits?.client_email_enabled },
            ], (r) => (r.enabled ? 0 : 1)).map((r) => <FeatureRow key={r.label} label={r.label} enabled={r.enabled} />)}
          </ul>
        </div>
      </div>

      {renewNotOpen ? (
        <div id="plan-options" className="scroll-mt-20 bg-card border border-border rounded-[15px] p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-success" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Pro is active until {formatDate(renewal.end)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Renewal opens on {formatDate(renewal.opensOn)}, 30 days before it ends. The new period starts after {formatDate(renewal.end)}, so no days are lost.</div>
            <div className="text-xs text-muted-foreground mt-1.5">Prices may change by then; you&apos;ll pay the price shown when you renew.</div>
          </div>
        </div>
      ) : (
      <div id="plan-options" className="scroll-mt-20">
        <h3 className="text-sm font-semibold mb-1">{renewing ? (renewal ? `Renew Pro · ${renewal.daysLeft === 0 ? "ends today" : `${renewal.daysLeft} ${renewal.daysLeft === 1 ? "day" : "days"} left`}` : "Renew Pro") : "Upgrade to Pro"}</h3>
        <div className="mb-2" />
        {needsAppUpdate && !isSuspended && (
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <RefreshCw className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Update Kramasha to continue</div>
                <div className="text-xs text-muted-foreground mt-0.5">A newer version of the app is available. Update first, then {renewing ? "renew" : "upgrade"}. It takes a few seconds and nothing you&apos;ve done is lost.</div>
              </div>
            </div>
            <Button size="sm" className="shrink-0" onClick={updateApp} disabled={updatingApp || appVersion === "downloading"}>
              {updatingApp ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : appVersion === "downloading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Getting update…</> : <><RefreshCw className="w-3.5 h-3.5" /> Update now</>}
            </Button>
          </div>
        )}
        {/* Before online payment is switched on (or a suspended workspace): one calm note, and the buttons say so. */}
        {isSuspended ? (
          <p className="mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">This workspace is suspended, so plans can't be bought right now. Please contact support.</p>
        ) : gatewayAvailable === false && proPricings.length > 0 ? (
          <p className="mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Online payment opens soon. Nothing is charged until then.</p>
        ) : null}
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
                  <div className="flex items-baseline gap-1 mt-2"><span className="text-3xl font-bold text-foreground">{money(p.price)}</span><span className="text-sm text-muted-foreground">{BILLING_PERIOD[p.billing_cycle]}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{renewal ? <>Adds {months} month{months > 1 ? "s" : ""} · <span className="font-medium text-foreground">Pro until {formatDate(addMonthsIso(renewal.end, months))}</span></> : <>{months} month{months > 1 ? "s" : ""} of Pro access</>}</div>
                  <div className="text-xs mt-1 h-4">{months > 1 && <span className="text-muted-foreground">{money(perMonth)}/month{savePct > 0 && <span className="ml-1.5 font-semibold text-success">Save {savePct}%</span>}</span>}</div>
                  <Button variant={popular ? "primary" : "outline"} size="sm" className="mt-4" disabled={!!paying || isSuspended || gatewayAvailable === false || needsAppUpdate} onClick={() => handlePayOnline(p.id)}>
                    {paying === p.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</> : gatewayAvailable === false && !isSuspended ? "Opens soon" : needsAppUpdate && !isSuspended ? "Update first" : <><CreditCard className="w-3.5 h-3.5" /> {renewing ? "Renew" : "Buy"}</>}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      <p className="text-xs text-muted-foreground px-1">
        Pro is prepaid for the period you choose and never renews on its own. See the{" "}
        <Link to="/refund-policy" className="font-medium text-foreground underline underline-offset-2">Refund &amp; Cancellation Policy</Link>,{" "}
        <Link to="/terms" className="font-medium text-foreground underline underline-offset-2">Terms</Link> and{" "}
        <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">Privacy Policy</Link>.
      </p>

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
              {/* Limits on top; then features in both plans, then Pro-only ones (—), each group in the order listed. */}
              {sortIncludedFirst([
                { label: "Quotation & Invoice creation", free: true, pro: true },
                { label: "PDF Export", free: cmp.free.pdf_export_enabled, pro: cmp.pro.pdf_export_enabled },
                { label: "Reminders (in-app)", free: true, pro: true },
                { label: "Public Profile URL", free: true, pro: true },
                { label: "App Lock", free: true, pro: true },
                { label: "Import & Export (Preferences)", free: true, pro: true },
                { label: "WhatsApp sharing & message templates", free: true, pro: true },
                { label: "Work from others (jobs other businesses book you for)", free: true, pro: true },
                { label: "Excel/CSV Export", free: cmp.free.excel_csv_export_enabled, pro: cmp.pro.excel_csv_export_enabled },
                { label: "Notifications", free: cmp.free.notifications_enabled, pro: cmp.pro.notifications_enabled },
                { label: `Link Sharing (quotation, invoice, ${term.workItemSingular.toLowerCase()})`, free: cmp.free.link_sharing_enabled, pro: cmp.pro.link_sharing_enabled },
                { label: "Client Portal", free: cmp.free.client_portal_enabled, pro: cmp.pro.client_portal_enabled },
                { label: "Team Portal", free: cmp.free.team_portal_enabled, pro: cmp.pro.team_portal_enabled },
                { label: "Track (work progress for clients)", free: cmp.free.client_portal_enabled, pro: cmp.pro.client_portal_enabled },
                { label: "Night & Pastel Themes", free: cmp.free.advanced_theme_enabled, pro: cmp.pro.advanced_theme_enabled },
                { label: `${term.workItemSingular} Display & Logo on Invoice`, free: cmp.free.event_display_customization_enabled, pro: cmp.pro.event_display_customization_enabled },
                { label: "Quotation Logo", free: cmp.free.quotation_logo_enabled, pro: cmp.pro.quotation_logo_enabled },
                { label: "Email clients from your Gmail (send, schedule, automatic)", free: cmp.free.client_email_enabled, pro: cmp.pro.client_email_enabled },
              ], (r) => (r.free ? 0 : r.pro ? 1 : 2)).map((r) => <CompareRow key={r.label} label={r.label} free={r.free} pro={r.pro} />)}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentHistory workspaceId={workspace?.id} workspace={workspace} refreshKey={historyKey} />

      <PaymentResultDialog
        open={!!payResult}
        onOpenChange={(o) => !o && setPayResult(null)}
        kind={payResult?.kind}
        detail={payResult?.detail}
        paymentId={payResult?.paymentId}
        onRetry={payResult?.pricingId ? () => { const id = payResult.pricingId; setPayResult(null); handlePayOnline(id); } : undefined}
      />
    </div>
  );
}

// Stable sort by group: ticked features first, so a "—" or locked row never sits between ticked ones.
function sortIncludedFirst(rows, group) {
  return rows.map((r, i) => [group(r), i, r]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
}

function FeatureRow({ label, enabled }) {
  return (<li className="flex items-center gap-2 text-sm">{enabled ? <Check className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}<span className={enabled ? "text-foreground" : "text-muted-foreground"}>{label}</span></li>);
}

function CompareRow({ label, free, pro }) {
  const fmt = (v) => { if (v === true) return <Check className="w-4 h-4 text-success mx-auto" />; if (v === false) return <span className="text-muted-foreground">—</span>; if (typeof v === "number") return v >= PLAN_UNLIMITED ? "Unlimited" : v; return v; };
  return (<tr className="border-t border-border"><td className="py-1.5">{label}</td><td className="py-1.5 text-center">{fmt(free)}</td><td className="py-1.5 text-center font-medium">{fmt(pro)}</td></tr>);
}