import React from "react";
import { Check } from "lucide-react";
import QuotationPreview from "@/components/landing/previews/QuotationPreview";
import TeamPreview from "@/components/landing/previews/TeamPreview";
import FinancialPreview from "@/components/landing/previews/FinancialPreview";

const blocks = [
  {
    eyebrow: "QUOTATIONS",
    title: "Professional quotes without the document chaos.",
    desc: "Build quotations from your services and rates, apply discounts and optional GST, then generate a polished branded PDF.",
    points: ["Services and custom items", "CGST/SGST & IGST support", "Branded PDF export"],
    Preview: QuotationPreview,
  },
  {
    eyebrow: "TEAM",
    title: "Know who's free before you assign the work.",
    desc: "See team availability, assignment dates and scheduling conflicts from one shared workspace.",
    points: ["Role and rate management", "Multi-day availability", "Conflict detection"],
    Preview: TeamPreview,
  },
  {
    eyebrow: "FINANCIALS",
    title: "Know your numbers without another spreadsheet.",
    desc: "Track receipts, team payments, expenses, pending balances and actual profitability for every project or event.",
    points: ["Received & pending", "Payments & expenses", "Profitability by project/event"],
    Preview: FinancialPreview,
  },
];

export default function Showcase() {
  return (
    <section id="showcase" className="py-20 sm:py-24 bg-[#F7F9FC] border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-20 sm:space-y-24">
        {blocks.map((b, i) => (
          <div
            key={b.title}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${
              i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div className="overflow-hidden">
              <b.Preview />
            </div>
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
                {b.eyebrow}
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {b.title}
              </h3>
              <p className="mt-4 text-muted-foreground text-base leading-relaxed">{b.desc}</p>
              <ul className="mt-6 space-y-3">
                {b.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-success" strokeWidth={3} />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}