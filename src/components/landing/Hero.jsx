import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Play } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import Reveal from "@/components/landing/Reveal";

const PILLS = ["Photography", "Event Management", "Freelancers", "Studios", "Creators", "Agencies", "Architects / Interior"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F5F3EF] pt-8 pb-20 sm:pt-12 sm:pb-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="flex flex-col items-start">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DB] bg-white px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-[#8A8580] uppercase mb-6">
                <span className="text-[#C8A95E]">✦</span>
                Plan · Manage · Deliver · Grow
              </div>
            </Reveal>

            <Reveal delay={50}>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-[#1A1A1A] leading-[1.05] mb-5">
                Kramasha — Built for Creative Businesses in Gujarat & India.
              </h1>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-base sm:text-lg text-[#8A8580] leading-relaxed mb-7 max-w-xl">
                The all-in-one CRM & management software for photographers, event managers, and creative studios across Ahmedabad, Surat, Vadodara, Rajkot, and all of Gujarat. Manage clients, events, teams, quotations, GST invoices, and payments in one place.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="flex flex-wrap gap-2 mb-7">
                {PILLS.map((p) => (
                  <span key={p} className="text-xs font-medium text-[#1A1A1A] bg-white border border-[#E8E3DB] rounded-full px-3 py-1.5">
                    {p}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-6">
                <Link to="/register" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-all">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-medium border border-[#E8E3DB] bg-white text-[#1A1A1A] hover:bg-[#FAF8F4] rounded-full transition-all">
                  <Play className="w-3.5 h-3.5" /> Watch Demo
                </Link>
              </div>
            </Reveal>

            <Reveal delay={250}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {["No credit card required", "Quick setup", "Built for creative businesses"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-[#8A8580]">
                    <Check className="w-3.5 h-3.5 text-[#C8A95E]" strokeWidth={2.5} />
                    {t}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
              <div className="relative">
                <DashboardPreview />
              </div>
              <div className="hidden lg:block absolute -bottom-6 -right-6 z-20">
                <MobilePreview />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}