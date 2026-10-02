import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

export default function CTA() {
  return (
    <section className="py-20 sm:py-28 bg-[#141414]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="rounded-[2rem] border border-[#2A2A2A] bg-[#0A0A0A] px-6 py-14 sm:px-12 sm:py-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#C8A95E]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#C8A95E]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white max-w-2xl mx-auto leading-tight">
                Stop Managing Your Business Across 10 Different Apps.
              </h2>
              <p className="mt-4 text-[#888] max-w-xl mx-auto text-base">
                Bring clients, events, teams, quotations, payments and finances into one connected workspace.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to="/register"
                  className="final_cta_start h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#C8A95E] text-white hover:bg-[#D4B876] rounded-full transition-all"
                >
                  Start Free Today <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}