import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

const BILLING_CYCLES = [
  { key: "MONTHLY", label: "Monthly", suffix: "/mo" },
  { key: "SIX_MONTHS", label: "6 Months", suffix: "/6 mo" },
  { key: "ANNUAL", label: "Annual", suffix: "/yr" },
];

const LIMIT_LABELS = {
  max_events: { label: "Projects / Events", type: "count" },
  max_team_members: { label: "Team Members", type: "count" },
  max_services: { label: "Services", type: "count" },
  quotation_enabled: { label: "Quotations", type: "flag" },
  pdf_export_enabled: { label: "PDF Export", type: "flag" },
  reminders_enabled: { label: "Event Reminders", type: "flag" },
  advanced_theme_enabled: { label: "Advanced Theme", type: "flag" },
};

const LIMIT_ORDER = [
  "max_events",
  "max_team_members",
  "max_services",
  "quotation_enabled",
  "pdf_export_enabled",
  "reminders_enabled",
  "advanced_theme_enabled",
];

function formatPrice(amount, currency) {
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function PlanCard({ plan, limits, pricing, billingCycle, isPopular }) {
  const isFree = plan.code === "FREE";
  const currentPrice = isFree ? null : pricing?.find((p) => p.billing_cycle === billingCycle);
  const cycleConfig = BILLING_CYCLES.find((c) => c.key === billingCycle);

  const sortedLimits = LIMIT_ORDER.map((key) => {
    const limit = limits.find((l) => l.limit_key === key && l.enabled);
    if (!limit) return null;
    const config = LIMIT_LABELS[key];
    if (config.type === "count") {
      return {
        label: config.label,
        value: limit.limit_value >= 999999 ? "Unlimited" : String(limit.limit_value),
        enabled: true,
      };
    }
    return {
      label: config.label,
      value: limit.limit_value === 1 ? "Included" : "—",
      enabled: limit.limit_value === 1,
    };
  }).filter(Boolean);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-7 ${
        isPopular
          ? "border-primary shadow-lg ring-1 ring-primary/20"
          : "border-border shadow-sm"
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

      <div className="mt-5 flex items-baseline gap-1">
        {isFree ? (
          <span className="text-4xl font-bold text-foreground">₹0</span>
        ) : (
          <>
            <span className="text-4xl font-bold text-foreground">
              {currentPrice ? formatPrice(currentPrice.price, currentPrice.currency) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">{cycleConfig?.suffix}</span>
          </>
        )}
      </div>

      <Link
        to="/register"
        data-cta={isFree ? "pricing_start_free" : "pricing_plan_select"}
        className={`mt-5 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
          isPopular
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {isFree ? "Start Free" : `Choose ${plan.name}`}
      </Link>

      <div className="mt-6 space-y-3 border-t border-border pt-5">
        {sortedLimits.map((limit, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{limit.label}</span>
            <span className={`flex items-center gap-1.5 font-medium ${limit.enabled ? "text-foreground" : "text-muted-foreground/60"}`}>
              {limit.enabled ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
              {limit.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("MONTHLY");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const [plans, pricings, limits] = await Promise.all([
          base44.entities.Plan.list(),
          base44.entities.PlanPricing.list(),
          base44.entities.PlanLimit.list(),
        ]);
        setData({ plans, pricings, limits });
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const sortedPlans = data
    ? [...data.plans].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  return (
    <section id="pricing" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[42px]">
            Simple pricing that grows with you.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Start free and upgrade when you need more. No credit card required to get started.
          </p>
        </div>

        {/* Billing cycle selector */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/30 p-1">
            {BILLING_CYCLES.map((cycle) => (
              <button
                key={cycle.key}
                onClick={() => setBillingCycle(cycle.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  billingCycle === cycle.key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cycle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Loading plans…</span>
          </div>
        ) : data ? (
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {sortedPlans.map((plan) => {
              const planLimits = data.limits.filter((l) => l.plan_id === plan.id);
              const planPricings = data.pricings.filter((p) => p.plan_id === plan.id);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  limits={planLimits}
                  pricing={planPricings}
                  billingCycle={billingCycle}
                  isPopular={plan.code === "PRO"}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Pricing is temporarily unavailable. Please try again later.
          </div>
        )}

        {/* Safe downgrade message */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Your existing business data isn't deleted if you downgrade.
        </div>
      </div>
    </section>
  );
}