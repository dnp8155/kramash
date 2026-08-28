import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan is available forever with no credit card required. Upgrade to Pro only when you need GST billing and advanced features.",
  },
  {
    q: "Can I use KRAMAS for non-photography businesses?",
    a: "Yes. KRAMAS supports Photography, Event Management, Architecture and custom business types. You can tailor labels and terminology to match your industry.",
  },
  {
    q: "Does it handle GST billing?",
    a: "Absolutely. Generate quotations with CGST/SGST or IGST modes, set GST rates per service, and produce export-ready PDFs with full tax breakdowns.",
  },
  {
    q: "Can my clients sign quotations online?",
    a: "Yes. Share a secure link and your client can review, e-sign and accept the quotation entirely online — no printing or scanning needed.",
  },
  {
    q: "Is my business data secure?",
    a: "Every workspace's data is strictly isolated using row-level security. Only you and your invited team members can access your business records.",
  },
  {
    q: "Can I track team availability and avoid double-booking?",
    a: "Yes. A shared availability calendar maps every crew member's assignments across events, so you can see who's free and who's booked at a glance.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            FAQ
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Questions, answered
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-heading text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}