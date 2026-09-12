import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, TrendingUp, CalendarCheck, Wallet, Users } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";

export default function Hero() {
  const floatingCards = [
    { label: "REVENUE", value: "₹18.4L", sub: "+24%", icon: TrendingUp, className: "top-0 -left-4", color: "#F58220" },
    { label: "UPCOMING SHOOTS", value: "7", sub: "this week", icon: CalendarCheck, className: "top-8 -right-4", color: "#2D7FF9" },
    { label: "OUTSTANDING", value: "₹2.1L", sub: "3 due", icon: Wallet, className: "bottom-8 -left-4", color: "#8B2BE2" },
    { label: "ACTIVE LEADS", value: "42", sub: "+8 today", icon: Users, className: "bottom-0 -right-4", color: "#0EA5A4" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#FDFCF8]">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#0B2125] mb-6 shadow-sm">
              <span className="text-logo-gradient text-sm font-bold">✦</span>
              <span>The operating system for service businesses</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#0B2125] leading-[1.05] mb-5">
              Run your entire business from{" "}
              <span className="text-logo-gradient">one workspace.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#666] leading-relaxed mb-8 max-w-xl">
              Manage clients, events, team availability, quotations, payments and profitability — all in one beautifully designed workspace built for photographers, event planners and creative studios.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                to="/register"
                className="hero_start_free h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#F58220] text-white hover:bg-[#E0741F] rounded-full shadow-lg shadow-[#F58220]/20 transition-all"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="hero_book_demo h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-medium border border-[#E5E5E5] bg-white text-[#0B2125] hover:bg-[#F9F9F9] rounded-full transition-all"
              >
                Book a Demo
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
              {["No credit card required", "Cancel anytime"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-[#666]">
                  <Check className="w-3.5 h-3.5 text-[#22A363]" strokeWidth={2.5} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating cards + dashboard */}
          <div className="relative">
            {/* Floating stat cards */}
            {floatingCards.map((card, i) => (
              <div
                key={i}
                className={`hidden lg:block absolute z-20 ${card.className} w-36 rounded-xl border border-[#E5E5E5] bg-white shadow-xl p-3`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}1A` }}>
                    <card.icon className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: card.color }} />
                  </div>
                  <div className="text-[9px] font-semibold text-[#999] uppercase tracking-wide">{card.label}</div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-[#0B2125] leading-none">{card.value}</span>
                  <span className="text-[10px] text-[#22A363] font-medium">{card.sub}</span>
                </div>
              </div>
            ))}
            {/* Dashboard mockup */}
            <div className="relative z-10">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}