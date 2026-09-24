import React from "react";
import { ChevronRight } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import Reveal from "@/components/landing/Reveal";

const CHAIN = ["Clients", "Events", "Team", "Services", "Payments", "Financials"];

export default function ProductShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-[#F5F3EF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Product Showcase</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            Everything stays connected.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Clients flow into events, events pull in team and services, payments feed into financials. No disconnected spreadsheets.
          </p>
        </Reveal>

        <Reveal delay={100} className="flex flex-wrap items-center gap-2 mb-10">
          {CHAIN.map((c, i) => (
            <React.Fragment key={c}>
              <span className="text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E8E3DB] rounded-full px-3 py-1.5">{c}</span>
              {i < CHAIN.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[#C8A95E]" />}
            </React.Fragment>
          ))}
        </Reveal>

        <Reveal delay={150} className="relative">
          <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
          <div className="relative flex items-center justify-center gap-6">
            <div className="flex-1 max-w-3xl">
              <DashboardPreview />
            </div>
            <div className="hidden lg:block shrink-0">
              <MobilePreview />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}