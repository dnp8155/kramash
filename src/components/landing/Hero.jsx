import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import { getBusinessTerminology } from "@/lib/businessTerminology";

export default function Hero() {
  const term = getBusinessTerminology({ business_category: "PHOTOGRAPHY" });

  return (
    <section className="relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F9F9F9] to-white pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-foreground mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
              <span>The operating system for service businesses</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.05] mb-5">
              Run your entire business from one workspace.
            </h1>
            <p className="text-base sm:text-lg text-[#666] leading-relaxed mb-8 max-w-xl">
              Manage clients, {term.workItemPlural.toLowerCase()}, team availability, quotations, payments and profitability — without juggling spreadsheets and disconnected tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                to="/register"
                className="hero_start_free h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#F58220] text-white hover:bg-[#E0741F] rounded-full shadow-lg shadow-[#F58220]/20 transition-all"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#showcase"
                className="hero_explore h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-medium border border-[#E5E5E5] bg-white text-foreground hover:bg-[#F9F9F9] rounded-full transition-all"
              >
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
              {["No credit card required", "GST-ready", "Free forever plan"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-[#666]">
                  <Check className="w-3.5 h-3.5 text-[#F58220]" strokeWidth={2.5} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — product preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-[#F58220]/5 rounded-[2rem] blur-3xl" />
            <div className="relative">
              <DashboardPreview terminology={term} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}