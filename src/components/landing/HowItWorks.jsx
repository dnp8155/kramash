import React from "react";

const steps = [
  {
    step: "01",
    title: "Capture leads",
    desc: "Log every enquiry, track follow-ups and convert qualified leads into clients.",
  },
  {
    step: "02",
    title: "Manage projects",
    desc: "Plan events, assign your team, send quotations and schedule every detail.",
  },
  {
    step: "03",
    title: "Deliver & grow",
    desc: "Collect payments, track profitability and let clients follow along in their portal.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24 border-t border-[#E5E5E5]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
            From setup to getting paid.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            Three steps. No spreadsheet gymnastics required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] right-[-1.5rem] h-px bg-[#E5E5E5]" />
              )}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F58220] text-white flex items-center justify-center font-heading text-xl font-semibold shrink-0">
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