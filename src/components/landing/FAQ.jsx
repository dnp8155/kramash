import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { homeFaqs } from "@/constants/faqContent";
import Reveal from "@/components/landing/Reveal";

const FAQS = homeFaqs;

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">FAQ</div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4 leading-tight">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-xl border border-[#2A2A2A] bg-[#141414] overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#C8A95E] shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-[#888] leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#141414] px-5 py-2.5 text-sm font-semibold text-[#C8A95E] hover:border-[#C8A95E]/50 transition-colors"
            >
              Read more FAQs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}