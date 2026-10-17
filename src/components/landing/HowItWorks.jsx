import React from "react";
import { Users, CalendarCheck, BarChart3, Wallet, Layers, IndianRupee, Wand2, Smartphone } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const STEPS = [
  { step: "01", title: "Capture Leads & Clients", desc: "Log every enquiry, track follow-ups and convert qualified leads into clients with full contact history.", icon: Users, color: "#C8A95E" },
  { step: "02", title: "Plan & Assign", desc: "Create events, assign team members, schedule services and set up availability without double-bookings.", icon: CalendarCheck, color: "#D4B876" },
  { step: "03", title: "Track & Manage", desc: "Monitor progress, manage quotations, send invoices and keep clients updated through their portal.", icon: BarChart3, color: "#C8A95E" },
  { step: "04", title: "Deliver & Get Paid", desc: "Collect payments against milestones, track expenses and see real-time profit for every project.", icon: Wallet, color: "#D4B876" },
];

// What sets Kramasha apart from generic CRMs and invoicing tools — kept to things the product really does.
const WHY = [
  { icon: Layers, title: "One app, not five", desc: "Leads, events, team, quotations, invoices and payments live together — no juggling a CRM, a spreadsheet and a billing tool." },
  { icon: IndianRupee, title: "Made for Indian businesses", desc: "GST invoicing, ₹ pricing and milestone payments (advance, event-day, final) the way you actually get paid." },
  { icon: Wand2, title: "Speaks your industry", desc: "Photographers see Events, architects see Projects. Labels, roles and services adapt to your business." },
  { icon: Smartphone, title: "Your clients & crew included", desc: "Clients get a portal to review, sign and track; your team gets theirs. Works on your phone like an app." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">How It Works</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 leading-tight">
            Simple. Structured. Smart.
          </h2>
          <p className="text-[#888] text-base sm:text-lg leading-relaxed">
            Four steps from first enquiry to final payment — without the spreadsheet chaos.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 80}>
              <div className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[calc(50%+2.5rem)] right-[-1.5rem] h-px bg-[#2A2A2A]" />
                )}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl border border-[#2A2A2A] bg-[#141414] flex items-center justify-center mb-5" style={{ boxShadow: `0 0 0 3px ${s.color}15` }}>
                    <s.icon className="w-6 h-6" strokeWidth={1.75} style={{ color: s.color }} />
                  </div>
                  <div className="text-xs font-bold tracking-wider mb-2" style={{ color: s.color }}>{s.step}</div>
                  <h3 className="font-heading text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-[#888] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Why Kramasha — how it differs from generic tools */}
        <Reveal className="mt-20 pt-14 border-t border-[#1F1F1F]">
          <div className="max-w-2xl mb-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-3">Why Kramasha</div>
            <h3 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight">
              Not another generic CRM. Built around how creative businesses work.
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-5">
                <w.icon className="w-5 h-5 text-[#C8A95E] mb-4" strokeWidth={1.75} />
                <h4 className="font-heading text-base font-semibold text-white mb-1.5">{w.title}</h4>
                <p className="text-sm text-[#888] leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}