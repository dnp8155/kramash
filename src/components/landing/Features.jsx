import React from "react";
import { CalendarCheck, FileText, Users, Wallet, Bell, BarChart3 } from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Event Management",
    desc: "Track every event from booking to delivery — dates, venues, contract values and status at a glance.",
  },
  {
    icon: FileText,
    title: "Quotations & GST Billing",
    desc: "Generate professional quotations with line items, discounts, CGST/SGST or IGST, and export-ready PDFs.",
  },
  {
    icon: Users,
    title: "Team & Availability",
    desc: "Assign crew per event, manage roles and rates, and visualise availability on a shared calendar.",
  },
  {
    icon: Wallet,
    title: "Payments & Financials",
    desc: "Record client receipts, team payouts and expenses. See profit per event and yearly summaries instantly.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    desc: "Automated event reminders and payment-due notifications so nothing slips through the cracks.",
  },
  {
    icon: BarChart3,
    title: "Insightful Dashboard",
    desc: "Clean stat cards and breakdowns that turn raw transaction data into decisions you can act on.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-24 bg-card/40 border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            FEATURES
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything your event business needs
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            One workspace replaces the spreadsheets, WhatsApp chats and sticky notes running your production today.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover hover:border-primary/30 hover-lift transition-all overflow-hidden"
            >
              {/* hover gradient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all">
                  <f.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}