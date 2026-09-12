import React from "react";

const steps = [
  {
    step: "01",
    title: "Capture leads",
    desc: "Log every enquiry, track follow-ups and convert qualified leads into clients.",
    color: "#F58220",
  },
  {
    step: "02",
    title: "Manage projects",
    desc: "Plan events, assign your team, send quotations and schedule every detail.",
    color: "#2D7FF9",
  },
  {
    step: "03",
    title: "Deliver & grow",
    desc: "Collect payments, track profitability and let clients follow along in their portal.",
    color: "#8B2BE2",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-[#FDFCF8]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#F9F9F9] px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-logo-gradient" />
            How it works
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
            From setup to getting paid.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            Three steps. No spreadsheet gymnastics required.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-7 left-[calc(50%+2rem)] right-[-1.5rem] h-px bg-[#E5E5E5]" />
              )}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-heading text-xl font-semibold shrink-0 shadow-lg"
                  style={{ backgroundColor: s.color, boxShadow: `0 10px 24px -6px ${s.color}55` }}
                >
                  {s.step}
                </div>
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed max-w-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}