import React from "react";
import {
  Users,
  CalendarDays,
  UsersRound,
  FileText,
  Receipt,
  TrendingUp,
  Globe,
  ShieldCheck,
  Bell,
  Calendar,
  Calculator,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client CRM & Leads",
    desc: "Capture leads, track follow-ups, set priorities and convert qualified leads into clients without losing context.",
    span: "lg:col-span-2",
  },
  {
    icon: CalendarDays,
    title: "Projects & Events",
    desc: "Plan multi-day events, assign venues, track progress and keep every detail connected.",
  },
  {
    icon: UsersRound,
    title: "Team Scheduling",
    desc: "Assign team by role, detect conflicts, block dates and track availability at a glance.",
  },
  {
    icon: FileText,
    title: "Quotation Builder",
    desc: "Build branded quotations with GST breakdowns, packages, milestones and polished PDF output.",
    span: "lg:col-span-2",
  },
  {
    icon: Receipt,
    title: "Invoices & Payments",
    desc: "Generate invoices, track milestones, record receipts and send public payment links.",
  },
  {
    icon: TrendingUp,
    title: "Profitability",
    desc: "Real numbers — receipts, team costs, expenses and net profit per project and per year.",
  },
  {
    icon: Globe,
    title: "Client Portal",
    desc: "Share a secure public project portal where clients track progress, quotations and payments.",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Job Sheets",
    desc: "Send crew-facing job sheets with every assignment detail, accessible on mobile.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    desc: "Automated event reminders and payment-due notifications so nothing slips through.",
  },
  {
    icon: Calendar,
    title: "Calendar View",
    desc: "Month, week and day views to see all your projects and team bookings in one place.",
  },
  {
    icon: Calculator,
    title: "Rate Estimator",
    desc: "Quickly estimate project rates based on services, team and days before sending a quotation.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    desc: "Fully responsive PWA — install on any device and manage your business on the go.",
    span: "lg:col-span-2",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-[#F9F9F9]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            Every tool you need
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
            One workspace. Your entire business.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            From the first client enquiry to final profitability — every workflow stays connected, organised and profitable.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group rounded-2xl border border-[#E5E5E5] bg-white p-6 sm:p-7 hover:shadow-lg hover:border-[#F58220]/30 transition-all duration-300 ${f.span || ""}`}
            >
              <div className="w-11 h-11 rounded-xl bg-[#F58220]/10 flex items-center justify-center mb-5 text-[#F58220] group-hover:scale-110 transition-transform duration-300">
                <f.icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}