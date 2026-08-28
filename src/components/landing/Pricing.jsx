import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const BOOLEAN_KEYS = new Set(["pdf_export_enabled", "reminders_enabled"]);

function formatLimitValue(key, value) {
  if (value === undefined || value === null) return null;
  if (BOOLEAN_KEYS.has(key)) {
    return value === true || value === "true" ? "Included" : null;
  }
  const num = parseInt(String(value), 10);
  if (num >= 999999) return "Unlimited";
  return String(num);
}

function limitLabel(key) {
  const map = {
    max_events: "Projects / Events",
    max_team_members: "Team Members",
    max_services: "Services",
    max_storage_gb: "Workspace Storage",
    pdf_export_enabled: "PDF Export",
    reminders_enabled: "Reminders",
  };
  return map[key] || key;
}

function formatStorageGb(gb) {
  if (!gb || gb <= 0) return null;
  if (gb >= 1024) return `${(gb / 1024).toFixed(gb % 1024 === 0 ? 0 : 1)} TB`;
  return `${gb} GB`;
}

export default function Pricing() {
  const [planData, setPlanData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [plans, pricings, allLimits] = await Promise.all([
          base44.entities.Plan.list(),
          base44.entities.PlanPricing.list(),
          base44.entities.PlanLimit.list(),
        ]);

        const activePlans = (plans || [])
          .filter((p) => p.is_active)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const data = activePlans.map((plan) => {
          const planPricings = (pricings || [])
            .filter((p) => p.plan_id === plan.id && p.is_active)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const monthly = planPricings.find((p) => p.billing_cycle === "MONTHLY") || planPricings[0] || null;

          const limits = {};
          (allLimits || [])
            .filter((l) => l.plan_id === plan.id && l.enabled)
            .forEach((l) => {
              limits[l.limit_key] = BOOLEAN_KEYS.has(l.limit_key)
                ? String(l.limit_value) === "true"
                : parseInt(String(l.limit_value), 10);
            });

          const storageGb = monthly?.storage_gb || limits.max_storage_gb || 0;
          return { plan, monthly, limits, storageGb, pricings: planPricings };
        });

        setPlanData(data);
      } catch (e) {
        setPlanData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section id="pricing" className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto" />
        </div>
      </section>
    );
  }

  if (planData.length === 0) return null;

  // Determine the "most popular" plan (middle one if 3+, or the one with highest price)
  const popularIndex = planData.length >= 3 ? Math.floor(planData.length / 2) : 0;

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            PRICING
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Plans that fit your business.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            Start free, upgrade when you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className={`grid gap-6 ${planData.length === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2 max-w-3xl mx-auto"}`}>
          {planData.map(({ plan, monthly, limits, storageGb }, i) => {
            const isPopular = i === popularIndex;
            const price = monthly?.price || 0;
            const currency = monthly?.currency || "INR";
            const cycleLabel = monthly?.billing_cycle === "ANNUAL" ? "/ year" : monthly?.billing_cycle === "SIX_MONTHS" ? "/ 6 months" : "/ month";

            const limitEntries = Object.entries(limits)
              .filter(([key]) => key !== "max_storage_gb")
              .map(([key, val]) => {
                const formatted = formatLimitValue(key, val);
                if (formatted === null) return null;
                return { label: limitLabel(key), value: formatted };
              })
              .filter(Boolean);

            const storageDisplay = formatStorageGb(storageGb);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-7 transition-all ${
                  isPopular
                    ? "border-primary/40 bg-card shadow-xl shadow-primary/10 lg:scale-[1.03]"
                    : "border-border bg-card shadow-card hover:shadow-card-hover"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-md">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-bold text-foreground">
                    {price === 0 ? "Free" : `${currency === "INR" ? "₹" : ""}${price.toLocaleString("en-IN")}`}
                  </span>
                  {price > 0 && <span className="text-sm text-muted-foreground">{cycleLabel}</span>}
                </div>

                <Link
                  to="/register"
                  className={`pricing_plan_select mt-6 h-11 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all ${
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                      : "border border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {price === 0 ? "Start Free" : `Choose ${plan.name}`}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <ul className="mt-6 space-y-3">
                  {limitEntries.map((entry, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-success" strokeWidth={3} />
                      </div>
                      <span className="font-medium">{entry.value}</span>
                      <span className="text-muted-foreground">{entry.label}</span>
                    </li>
                  ))}
                  {storageDisplay && (
                    <li className="flex items-center gap-3 text-sm text-foreground">
                      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-success" strokeWidth={3} />
                      </div>
                      <span className="font-medium">{storageDisplay}</span>
                      <span className="text-muted-foreground">storage</span>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Your existing business data isn't deleted if you downgrade.
        </p>
      </div>
    </section>
  );
}