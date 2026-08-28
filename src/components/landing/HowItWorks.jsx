import React from "react";
import { Rocket, Layers, Receipt } from "lucide-react";

const steps = [
  {
    icon: Rocket,
    step: "01",
    title: "Set up your workspace",
    desc: "Create a workspace, pick your industry, and customise labels. Invite your team in seconds — all in one onboarding flow.",
  },
  {
    icon: Layers,
    step: "02",
    title: "Add events, clients & crew",
    desc: "Log your bookings, attach clients, assign team members and select services. Multi-date events and shared availability handled.",
  },
  {
    icon: Receipt,
    step: "03",
    title: "Quote, bill & track — done",
    desc: "Generate GST quotations, send online signing links, record payments and watch profit unfold on your dashboard.",
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
            Live in three simple steps
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            No lengthy setup, no data migration headaches. Get from sign-up to your first quotation in minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {steps.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="relative inline-flex w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/10" />
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