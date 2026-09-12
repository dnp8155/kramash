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
    <section id="how-it-works" className="py-20 sm:py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            From setup to getting paid in three simple steps.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((s) => (
            <div key={s.step} className="bg-card rounded-3xl border border-border p-8 text-center shadow-sm hover-lift">
              <div className="text-primary font-heading text-4xl font-semibold mb-5 pb-4 border-b border-border inline-block px-4">
                {s.step}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <s.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}