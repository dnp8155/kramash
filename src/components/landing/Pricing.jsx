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
    pdf_export_enabled: "PDF Export",
    reminders_enabled: "Reminders",
  };
  return map[key] || key;
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

          return { plan, monthly, limits, pricings: planPricings };
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
      <section id="pricing" className="py-20 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto" />
        </div>
      </section>
    );
  }

  if (planData.length === 0) return null;

  const popularIndex = planData.length >= 3 ? Math.floor(planData.length / 2) : 0;

  return (
    <section id="pricing" className="py-20 sm:py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            Plans that fit your business.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Start free, upgrade when you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className={`grid gap-6 ${planData.length === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2 max-w-3xl mx-auto"}`}>
          {planData.map(({ plan, monthly, limits }, i) => {
            const isPopular = i === popularIndex;
            const price = monthly?.price || 0;
            const currency = monthly?.currency || "INR";
            const cycleLabel = monthly?.billing_cycle === "ANNUAL" ? "/ year" : monthly?.billing_cycle === "SIX_MONTHS" ? "/ 6 months" : "/ month";

            const limitEntries = Object.entries(limits)
              .map(([key, val]) => {
                const formatted = formatLimitValue(key, val);
                if (formatted === null) return null;
                return { label: limitLabel(key), value: formatted };
              })
              .filter(Boolean);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border p-8 sm:p-10 flex flex-col transition-all ${
                  isPopular
                    ? "border-[#F58220] bg-card shadow-xl shadow-[#F58220]/10 lg:scale-[1.03] border-2"
                    : "border-[#E5E5E5] bg-card shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full bg-[#F58220] text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${isPopular ? "text-[#F58220]" : "text-[#999]"}`}>
                  {plan.name}
                </span>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-heading text-4xl font-semibold text-foreground">
                    {price === 0 ? "Free" : `${currency === "INR" ? "₹" : ""}${price.toLocaleString("en-IN")}`}
                  </span>
                  {price > 0 && <span className="text-sm font-normal text-muted-foreground">{cycleLabel}</span>}
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-8">{plan.description}</p>
                )}

                <Link
                  to="/register"
                  className={`pricing_plan_select h-12 w-full inline-flex items-center justify-center gap-2 text-sm font-medium rounded-full transition-all mb-8 ${
                    isPopular
                      ? "bg-[#F58220] text-white hover:bg-[#E0741F] shadow-md shadow-[#F58220]/25"
                      : "bg-[#F9F9F9] text-foreground hover:bg-[#F1F1F1] border border-[#E5E5E5]"
                  }`}
                >
                  {price === 0 ? "Start Free" : `Choose ${plan.name}`}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <ul className="space-y-3 border-t border-border pt-6">
                  {limitEntries.map((entry, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-foreground">
                      <Check className="w-4 h-4 text-[#F58220] shrink-0" />
                      <span className="font-medium">{entry.value}</span>
                      <span className="text-muted-foreground">{entry.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Your existing business data is never deleted if you choose to downgrade.
        </p>
      </div>
    </section>
  );
}