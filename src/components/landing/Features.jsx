import React from "react";
import {
  Users,
  CalendarDays,
  UsersRound,
  FileText,
  Receipt,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client CRM",
    desc: "Capture leads, track follow-ups and convert them into clients without losing context.",
  },
  {
    icon: CalendarDays,
    title: "Projects & Events",
    desc: "Plan multi-day events, assign venues and keep every detail connected in one place.",
  },
  {
    icon: UsersRound,
    title: "Team Availability",
    desc: "Assign team members by role, detect scheduling conflicts and block dates instantly.",
  },
  {
    icon: FileText,
    title: "Quotations & GST",
    desc: "Build branded quotations with GST breakdowns, terms and polished PDF output.",
  },
  {
    icon: Receipt,
    title: "Invoices & Payments",
    desc: "Generate invoices, track milestones and record receipts against every project.",
  },
  {
    icon: TrendingUp,
    title: "Profitability Tracking",
    desc: "Know your real numbers — receipts, team costs, expenses and net profit per project.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-24 border-t border-[#E5E5E5] bg-[#F9F9F9]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Everything you need.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            From the first client enquiry to final profitability, your core workflow stays connected.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E5E5E5] rounded-2xl overflow-hidden border border-[#E5E5E5]">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white p-7 sm:p-8 flex flex-col"
            >
              <div className="w-10 h-10 rounded-xl border border-[#E5E5E5] flex items-center justify-center mb-5 text-[#F58220]">
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