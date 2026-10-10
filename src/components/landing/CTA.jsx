import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

export default function CTA() {
  return (
    <section className="py-20 sm:py-28 bg-[#141414]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="rounded-[2rem] border border-[#2A2A2A] bg-[#0A0A0A] px-6 py-16 sm:px-12 sm:py-24 text-center relative overflow-hidden isolate">
            {/* Aurora: a warm gold glow, a deep blue one and a soft teal one drifting slowly */}
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <div className="aurora-blob aurora-a -top-24 left-[8%] w-[22rem] h-[22rem] bg-[#C8A95E]/25" />
              <div className="aurora-blob aurora-b -bottom-28 right-[6%] w-[24rem] h-[24rem] bg-[#2D4899]/35" />
              <div className="aurora-blob aurora-c top-1/3 left-1/2 w-[18rem] h-[18rem] bg-[#3FA796]/15" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0A]/60" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C8A95E]/30 bg-[#C8A95E]/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-[#E8D5A3] uppercase mb-6">
                <span>✦</span> Your craft. Your pace.
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white max-w-2xl mx-auto leading-tight">
                You bring the vision.{" "}
                <span className="cta-gradient-text">Kramasha runs the rest.</span>
              </h2>
              <p className="mt-5 text-[#9A9A9A] max-w-xl mx-auto text-base leading-relaxed">
                Clients, events, teams, quotations, payments and finances — one calm, connected workspace, so you can get back to creating.
              </p>
              <div className="mt-9 flex justify-center">
                <Link
                  to="/register"
                  className="final_cta_start h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#C8A95E] text-white hover:bg-[#D4B876] rounded-full shadow-[0_0_40px_-8px_rgba(200,169,94,0.6)] transition-all"
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
