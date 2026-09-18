import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Reveal from "@/components/landing/Reveal";

const FREE_FEATURES = [
  "Up to 3 Projects / Events",
  "Up to 5 Team Members",
  "Up to 3 Services",
  "Up to 10 Leads",
  "Quotations & Invoices",
  "Reminders",
  "Public Profile URL",
  "App Lock",
  "Data Export",
];

const PRO_FEATURES = [
  "Unlimited Projects / Events",
  "Up to 50 Team Members",
  "Unlimited Services",
  "Unlimited Leads",
  "Everything in Free, plus:",
  "Excel / CSV Export",
  "Notifications",
  "Link Sharing",
  "Client Portal",
  "Team Portal",
  "Night & Pastel Themes",
  "Event Display Customization",
  "Quotation Logo",
];

export default function Pricing() {
  const [planData, setPlanData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [plans, pricings] = await Promise.all([
          base44.entities.Plan.list(),
          base44.entities.PlanPricing.list(),
        ]);

        const activePlans = (plans || [])
          .filter((p) => p.is_active)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const data = activePlans.map((plan) => {
          const planPricings = (pricings || [])
            .filter((p) => p.plan_id === plan.id && p.is_active)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const monthly = planPricings.find((p) => p.billing_cycle === "MONTHLY") || planPricings[0] || null;

          return { plan, pricings: planPricings, monthly };
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
      <section id="pricing" className="py-20 sm:py-28 bg-[#FAF8F4]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Loader2 className="w-6 h-6 text-[#C8A95E] animate-spin mx-auto" />
        </div>
      </section>
    );
  }

  if (planData.length === 0) return null;

  const popularIndex = planData.length >= 2 ? 1 : 0;

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#FAF8F4]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Pricing</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            Plans that fit your business.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Start free, upgrade when you grow. No hidden fees, cancel anytime.
          </p>
        </Reveal>

        <div className={`grid gap-6 ${planData.length === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2 max-w-3xl mx-auto"}`}>
          {planData.map(({ plan, pricings, monthly }, i) => {
            const isPopular = i === popularIndex;
            const isFree = (plan.name || "").toLowerCase().includes("free");
            const price = monthly?.price || 0;
            const currency = monthly?.currency || "INR";
            const cycleLabel = monthly?.billing_cycle === "ANNUAL" ? "/ year" : monthly?.billing_cycle === "SIX_MONTHS" ? "/ 6 months" : "/ month";
            const features = isFree ? FREE_FEATURES : PRO_FEATURES;

            return (
              <Reveal key={plan.id} delay={i * 80}>
                <div className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-all h-full ${
                  isPopular
                    ? "border-[#C8A95E] bg-white shadow-xl lg:scale-[1.03] border-2"
                    : "border-[#E8E3DB] bg-white shadow-sm"
                }`}>
                  {isPopular && (
                    <div className="absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full bg-[#C8A95E] text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md">
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </div>
                  )}
                  <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${isPopular ? "text-[#C8A95E]" : "text-[#8A8580]"}`}>
                    {plan.name}
                  </span>
                  <div className="flex items-baseline gap-1.5 mb-4">
                    <span className="font-heading text-4xl font-semibold text-[#1A1A1A]">
                      {price === 0 ? "Free" : `${currency === "INR" ? "₹" : ""}${price.toLocaleString("en-IN")}`}
                    </span>
                    {price > 0 && <span className="text-sm font-normal text-[#8A8580]">{cycleLabel}</span>}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-[#8A8580] mb-8">{plan.description}</p>
                  )}

                  <Link
                    to="/register"
                    className={`pricing_plan_select h-12 w-full inline-flex items-center justify-center gap-2 text-sm font-medium rounded-full transition-all mb-8 ${
                      isPopular
                        ? "bg-[#1A1A1A] text-white hover:bg-[#C8A95E]"
                        : "bg-[#F5F3EF] text-[#1A1A1A] hover:bg-[#E8E3DB] border border-[#E8E3DB]"
                    }`}
                  >
                    {price === 0 ? "Start Free" : `Choose ${plan.name}`}
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <ul className="space-y-3 border-t border-[#E8E3DB] pt-6">
                    {features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                        <Check className="w-4 h-4 text-[#C8A95E] shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {pricings.length > 1 && (
                    <div className="mt-6 pt-4 border-t border-[#E8E3DB] space-y-1.5">
                      {pricings.map((p, j) => (
                        <div key={j} className="flex justify-between text-xs text-[#8A8580]">
                          <span>{p.billing_cycle === "MONTHLY" ? "Monthly" : p.billing_cycle === "SIX_MONTHS" ? "6 Months" : p.billing_cycle === "ANNUAL" ? "Annual" : p.billing_cycle}</span>
                          <span className="font-medium text-[#1A1A1A]">{currency === "INR" ? "₹" : ""}{p.price.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#8A8580]">
          Your existing business data is never deleted if you choose to downgrade.
        </p>
      </div>
    </section>
  );
}