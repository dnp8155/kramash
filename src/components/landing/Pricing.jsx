import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Loader2, Gift, UserPlus, Crown, BadgeCheck,
  CalendarDays, Users, Briefcase, Target, FileText, Bell, Globe, MessageCircle, Lock, Download,
  Infinity as InfinityIcon, FileSpreadsheet, BellRing, Link2, UserCheck, Mail, CalendarClock, Palette, Image as ImageIcon, Stamp,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import Reveal from "@/components/landing/Reveal";
import AnimatedNumber from "@/components/common/AnimatedNumber";
import { getActiveLaunchOffer, isFreeMonthNoteVisible, FREE_MONTH_SHORT } from "@/constants/launchOffer";
import { FestiveBanner, MarigoldToran, Diya, Fireworks } from "@/components/landing/FestiveOffer";

const FREE_FEATURES = [
  { icon: CalendarDays, label: "Up to 5 Projects / Events" },
  { icon: Users, label: "Up to 3 Team Members" },
  { icon: Briefcase, label: "Up to 5 Services" },
  { icon: Target, label: "Up to 50 Leads" },
  { icon: FileText, label: "Quotations & Invoices" },
  { icon: Bell, label: "Reminders" },
  { icon: Globe, label: "My Profile Page & Inquiry Form" },
  { icon: MessageCircle, label: "WhatsApp Sharing & Message Templates" },
  { icon: Lock, label: "App Lock" },
  { icon: Download, label: "Data Export" },
];

const PRO_FEATURES = [
  { icon: InfinityIcon, label: "Unlimited Projects / Events" },
  { icon: Users, label: "Up to 50 Team Members" },
  { icon: Briefcase, label: "Unlimited Services" },
  { icon: Target, label: "Unlimited Leads" },
  "Everything in Free, plus:",
  { icon: FileSpreadsheet, label: "Excel / CSV Export" },
  { icon: BellRing, label: "Push Notifications" },
  { icon: Link2, label: "Link Sharing" },
  { icon: UserCheck, label: "Client Portal & Team Portal" },
  { icon: Mail, label: "Email Clients from Your Gmail" },
  { icon: CalendarClock, label: "Scheduled & Automatic Reminders" },
  { icon: Palette, label: "Night & Pastel Themes" },
  { icon: ImageIcon, label: "Event Display & Shared Logo" },
  { icon: Stamp, label: "Quotation Logo" },
];

// How a selected early user gets the free month (admin-approved; see Admin → Upgrade Requests).
const FREE_MONTH_STEPS = [
  { icon: UserPlus, title: "Sign up free", desc: "Create your Kramasha account and set up your workspace." },
  { icon: Crown, title: "Request an upgrade", desc: "Open Your Plan and tap Request Upgrade in the launch offer box." },
  { icon: BadgeCheck, title: "We verify & activate", desc: "If you're selected, Pro goes live free for 1 month. We'll let you know." },
];

const CYCLES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "ANNUAL", label: "Yearly" },
];

export default function Pricing() {
  const [planData, setPlanData] = useState([]);
  const [loading, setLoading] = useState(true);
  // Defaults to Yearly so the best-value price is what visitors see first.
  const [cycle, setCycle] = useState("ANNUAL");

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
      } catch {
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

  // Festive launch offer (Diwali) — decoration for this section only; switches itself off after its end date.
  const offer = getActiveLaunchOffer();

  const popularIndex = planData.length >= 2 ? 1 : 0;

  // % saved on Yearly vs. paying Monthly × 12, from whichever plan has both.
  const yearlySavingsPct = (() => {
    for (const { pricings } of planData) {
      const m = pricings.find((p) => p.billing_cycle === "MONTHLY");
      const y = pricings.find((p) => p.billing_cycle === "ANNUAL");
      if (m?.price && y?.price) {
        const pct = Math.round((1 - y.price / (m.price * 12)) * 100);
        if (pct > 0) return pct;
      }
    }
    return null;
  })();

  return (
    <section id="pricing" className={`relative overflow-hidden py-20 sm:py-28 ${offer ? "bg-gradient-to-b from-[#FFF3E0] via-[#FFF8EE] to-[#FAF8F4]" : "bg-[#FAF8F4]"}`}>
      {offer && <Fireworks />}
      {offer && <div className="absolute top-0 inset-x-0"><MarigoldToran /></div>}
      <div className={`relative mx-auto max-w-6xl px-4 sm:px-6 ${offer ? "pt-4" : ""}`}>
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Pricing</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            Plans that fit your business.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Start free, upgrade when you grow. No hidden fees, no auto-renewal.
          </p>
        </Reveal>

        {offer && <Reveal><FestiveBanner offer={offer} /></Reveal>}

        {isFreeMonthNoteVisible() && (
          <Reveal>
            <div className="mb-10 mx-auto max-w-3xl rounded-2xl border border-[#C8A95E]/40 bg-white px-5 py-6 sm:px-8">
              <div className="text-center">
                <div className="text-sm font-semibold text-[#1A1A1A] inline-flex items-center justify-center gap-2"><Gift className="w-4 h-4 text-[#C8A95E]" strokeWidth={2} />Get your first month of Pro free</div>
                <p className="text-xs text-[#8A8580] mt-1">Limited spots for selected early users — here's how to apply.</p>
              </div>
              <ol className="mt-5 grid sm:grid-cols-3 gap-4">
                {FREE_MONTH_STEPS.map((st, i) => (
                  <li key={st.title} className="flex sm:flex-col items-start sm:items-center sm:text-center gap-3">
                    <span className="relative w-10 h-10 rounded-xl bg-[#C8A95E]/10 text-[#C8A95E] flex items-center justify-center shrink-0">
                      <st.icon className="w-5 h-5" strokeWidth={1.75} />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1A1A1A] text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#1A1A1A]">{st.title}</span>
                      <span className="block text-xs text-[#8A8580] leading-relaxed mt-0.5">{st.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-center text-[11px] text-[#8A8580]">After the free month, continue on any plan below — or simply stay on Free. No auto-charge.</p>
            </div>
          </Reveal>
        )}

        <div className={`grid gap-6 ${planData.length === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2 max-w-3xl mx-auto"}`}>
          {planData.map(({ plan, pricings, monthly }, i) => {
            const isPopular = i === popularIndex;
            const isFree = (plan.name || "").toLowerCase().includes("free");
            // Falls back to monthly when this plan has no pricing row for the
            // selected cycle (e.g. Free, which only ever has one $0 entry).
            const selected = pricings.find((p) => p.billing_cycle === cycle) || monthly;
            const price = selected?.price || 0;
            const currency = selected?.currency || "INR";
            const billedOnCycle = price > 0 && selected?.billing_cycle === cycle;
            const cycleLabel = selected?.billing_cycle === "ANNUAL" ? "/ year" : selected?.billing_cycle === "SIX_MONTHS" ? "/ 6 months" : "/ month";
            const features = isFree ? FREE_FEATURES : PRO_FEATURES;
            // Regular (post-offer) price for this billing cycle, struck through during the offer. Only shown when set.
            const listPrice = Number(offer?.listPrices?.[selected?.billing_cycle]) || 0;

            return (
              <Reveal key={plan.id} delay={i * 80}>
                <div className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-all h-full ${
                  isPopular
                    ? (offer && !isFree ? "border-[#FF7A00] bg-white shadow-xl shadow-orange-200/60 lg:scale-[1.03] border-2" : "border-[#C8A95E] bg-white shadow-xl lg:scale-[1.03] border-2")
                    : "border-[#E8E3DB] bg-white shadow-sm"
                }`}>
                  {offer && !isFree && (
                    <div className="absolute -top-3.5 left-8 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#C8321E] to-[#FF7A00] text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md">
                      <Diya className="w-3.5 h-3.5" glow={false} />
                      {offer.copy.ribbon}
                    </div>
                  )}
                  {isPopular && (
                    <div className="absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full bg-[#C8A95E] text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md">
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </div>
                  )}
                  <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${isPopular ? "text-[#C8A95E]" : "text-[#8A8580]"}`}>
                    {plan.name}
                  </span>

                  {!isFree && (
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-[#F5F3EF] border border-[#E8E3DB] mb-4 w-fit">
                      {CYCLES.map((c) => {
                        const active = cycle === c.value;
                        return (
                          <button
                            key={c.value}
                            onClick={() => setCycle(c.value)}
                            className={`relative px-2.5 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap ${
                              active ? "bg-[#1A1A1A] text-white" : "text-[#8A8580] hover:text-[#1A1A1A]"
                            }`}
                          >
                            {c.label}
                            {c.value === "ANNUAL" && yearlySavingsPct > 0 && (
                              <span
                                className={`ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                                  active ? "bg-[#C8A95E] text-white" : "bg-[#C8A95E]/15 text-[#C8A95E]"
                                }`}
                              >
                                -{yearlySavingsPct}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {price === 0 ? (
                    <div className="mb-1">
                      <div className="font-heading text-4xl font-semibold text-[#1A1A1A]">Free</div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
                      {offer && listPrice > price && (
                        <span className="text-lg font-medium text-[#8A8580] line-through tabular-nums">{currency === "INR" ? "₹" : ""}{listPrice}</span>
                      )}
                      <span className="font-heading text-4xl font-semibold text-[#1A1A1A] tabular-nums">
                        {currency === "INR" ? "₹" : ""}
                        <AnimatedNumber value={price} />
                      </span>
                      <span className="text-sm font-normal text-[#8A8580]">{cycleLabel}</span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-[#C8A95E] mb-4 h-4">
                    {offer && listPrice > price
                      ? <span className="text-[#C8321E] font-semibold">{Math.round((1 - price / listPrice) * 100)}% off · launch price</span>
                      : (billedOnCycle && cycle === "ANNUAL" ? "Billed annually" : " ")}
                  </p>
                  {plan.description && (
                    <p className="text-sm text-[#8A8580] mb-8">{plan.description}</p>
                  )}

                  {isFreeMonthNoteVisible() && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl bg-[#C8A95E]/10 px-3 py-2.5 text-xs font-medium text-[#8A6D2B]">
                      <Gift className="w-4 h-4 shrink-0 text-[#C8A95E]" strokeWidth={2} />
                      <span>Launch offer: {FREE_MONTH_SHORT}</span>
                    </div>
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
                    {features.map((f, j) => {
                      const isDivider = typeof f === "string" && f.toLowerCase().startsWith("everything in");
                      return (
                        <li
                          key={j}
                          className={isDivider ? "text-sm font-bold text-[#1A1A1A] pt-1" : "flex items-start gap-2.5 text-sm text-[#1A1A1A]"}
                        >
                          {isDivider ? (
                            f
                          ) : (
                            <>
                              <span className="w-6 h-6 rounded-lg bg-[#C8A95E]/10 text-[#C8A95E] flex items-center justify-center shrink-0 -mt-0.5">
                                <f.icon className="w-3.5 h-3.5" strokeWidth={2} />
                              </span>
                              <span>{f.label}</span>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
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