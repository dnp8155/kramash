import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import { getBusinessTerminology } from "@/lib/businessTerminology";

export default function Hero() {
  const term = getBusinessTerminology({ business_category: "PHOTOGRAPHY" });

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-[#F9F9F9] px-3.5 py-1.5 text-xs font-medium text-foreground mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
              <span>The operating system for independent service studios</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-foreground leading-[1.1] mb-5">
              Run your entire service business from one workspace.
            </h1>
            <p className="text-base sm:text-lg text-[#666] leading-relaxed mb-8 max-w-xl">
              Manage clients, projects or events, team availability, quotations, payments and profitability — without juggling spreadsheets and disconnected tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                to="/register"
                className="hero_start_free h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#F58220] text-white hover:bg-[#E0741F] rounded-full shadow-sm transition-all"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="hero_explore h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-medium border border-[#E5E5E5] bg-white text-foreground hover:bg-[#F9F9F9] rounded-full transition-all"
              >
                See how it works
              </a>
            </div>

            <p className="text-xs text-[#999] mt-4">
              No credit card required · GST-ready quotations
            </p>
          </div>

          {/* Right — product preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-[#F58220]/5 rounded-[2rem] blur-2xl" />
            <div className="relative">
              <DashboardPreview terminology={term} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}