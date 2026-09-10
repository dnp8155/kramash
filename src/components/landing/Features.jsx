import React from "react";
import { Users, CalendarCheck, Wrench, FileText, Wallet, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Clients & Projects",
    desc: "Keep client details and every related project or event organized in one place.",
    note: "Events for Photography & Event Management · Projects for Architecture & other services",
  },
  {
    icon: CalendarCheck,
    title: "Team & Availability",
    desc: "Assign team members, track roles and rates, and identify scheduling conflicts before they become problems.",
  },
  {
    icon: Wrench,
    title: "Services & Rate Estimator",
    desc: "Configure your services and rates, then create fast estimates using real team and service costs.",
  },
  {
    icon: FileText,
    title: "Professional Quotations",
    desc: "Build branded quotations with services, discounts, optional GST, terms and polished PDF output.",
  },
  {
    icon: Wallet,
    title: "Payments & Expenses",
    desc: "Record client receipts, team payments and business expenses without maintaining separate ledgers.",
  },
  {
    icon: TrendingUp,
    title: "Profitability",
    desc: "Know what you've received, what's pending, what you've paid and what each project or event actually earned.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            CORE WORKSPACE
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything you need to manage the work.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            From the first client enquiry to final profitability, your core business workflow stays connected.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover-lift transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-all">
                <f.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              {f.note && (
                <p className="mt-3 text-xs text-muted-foreground/80 italic border-l-2 border-border pl-2.5">
                  {f.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}