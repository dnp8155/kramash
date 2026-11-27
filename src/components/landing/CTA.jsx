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
            {/* Aurora: the logo's own colours (amber, violet, cyan, blue) drifting very slowly */}
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <div className="aurora-blob aurora-a -top-24 left-[6%] w-[22rem] h-[22rem] bg-[#FCAD34]/20" />
              <div className="aurora-blob aurora-b -bottom-28 right-[4%] w-[24rem] h-[24rem] bg-[#B125FC]/30" />
              <div className="aurora-blob aurora-c top-[8%] right-[10%] w-[18rem] h-[18rem] bg-[#1AD1E6]/15" />
              <div className="aurora-blob aurora-d -bottom-24 left-[12%] w-[20rem] h-[20rem] bg-[#3265F0]/30" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0A]/60" />
            </div>

            <div className="relative">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white max-w-2xl mx-auto leading-tight">
                You bring the vision.
                <span className="cta-gradient-text block">Kramasha runs the rest.</span>
              </h2>
              <p className="mt-5 text-[#9A9A9A] max-w-xl mx-auto text-base leading-relaxed">
                Clients, events, teams, quotations, payments and finances — one calm, connected workspace, so you can get back to creating.
              </p>
              <div className="mt-9 flex justify-center">
                <Link
                  to="/register"
                  className="final_cta_start h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#FBF8F1] text-[#9A7B2F] hover:bg-white rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.45)] transition-all"
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
