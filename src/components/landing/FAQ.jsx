import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const FAQS = [
  {
    q: "What is Kramashah?",
    a: "A connected business management platform for creative and service-based businesses. Manage clients, events, teams, quotations, invoices, payments and finances — all in one place.",
  },
  {
    q: "Who is Kramashah for?",
    a: "Photographers, event managers, architects, interior designers, freelancers, studios, creative agencies and any service-based business that needs to manage clients, projects, teams and finances.",
  },
  {
    q: "Can photographers use it?",
    a: "Yes. Photography is one of the primary use cases. Kramashah supports wedding packages, add-ons, team scheduling, client-facing quotations (without exposing internal costs), e-sign, invoices and job sheets.",
  },
  {
    q: "Can event managers use it?",
    a: "Yes. Event Management has ready-made workflows for multi-day events, vendor coordination, crew job sheets, milestone billing and team availability tracking.",
  },
  {
    q: "Can I manage teams?",
    a: "Yes. Add team members, assign roles, set rates, assign to events with specific dates, track availability and avoid double-bookings.",
  },
  {
    q: "Can clients sign quotations?",
    a: "Yes. Send quotations via a secure public link. Clients review online and digitally sign — no printing or scanning needed.",
  },
  {
    q: "Can I create invoices?",
    a: "Yes. Generate full invoices or milestone-based invoices linked to payment schedules. Invoices can be sent via public links and downloaded as PDFs.",
  },
  {
    q: "Can I track milestone payments?",
    a: "Yes. Create payment milestones (advance, event day, final handover), link them to invoices, and track paid vs outstanding amounts per milestone.",
  },
  {
    q: "Can I manage expenses?",
    a: "Yes. Track business expenses including rent, electricity, software subscriptions, EMI, food, travel and custom categories. Expenses feed into your profit & loss statement.",
  },
  {
    q: "Does it support mobile?",
    a: "Yes. Kramashah is a responsive web app with PWA support. Install it on your phone or use it in any browser. Works on mobile and desktop.",
  },
  {
    q: "What happens when I upgrade?",
    a: "Your existing data stays exactly the same. Upgrading unlocks expanded limits and Pro features. No data is lost or changed.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. You can cancel anytime. Your existing business data is never deleted if you downgrade — you keep all your clients, projects, quotations and financial records.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">FAQ</div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4 leading-tight">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-xl border border-[#2A2A2A] bg-[#141414] overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#C8A95E] shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-[#888] leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}