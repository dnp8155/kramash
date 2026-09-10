import React from "react";
import { Rocket, Layers, Receipt } from "lucide-react";

const steps = [
  {
    icon: Rocket,
    step: "01",
    title: "Set up your workspace",
    desc: "Choose your business category, configure services and set up your team roles.",
  },
  {
    icon: Layers,
    step: "02",
    title: "Add clients and work",
    desc: "Create projects or events, assign team members and keep every detail connected.",
  },
  {
    icon: Receipt,
    step: "03",
    title: "Quote, collect and track",
    desc: "Create quotations, record payments and understand your real profitability.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            HOW IT WORKS
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            From setup to getting paid in three simple steps.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {steps.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="relative inline-flex w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/8" />
                <div className="absolute inset-2 rounded-full bg-card border border-border shadow-sm flex items-center justify-center">
                  <s.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {s.step}
                </div>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}