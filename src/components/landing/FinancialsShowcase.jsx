import React from "react";
import { Check } from "lucide-react";
import FinancePreview from "@/components/landing/previews/FinancePreview";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  "Income tracking",
  "Expense management",
  "Revenue vs expenses",
  "Outstanding receivables",
  "Profit / loss statement",
  "Team payments",
  "Service payments",
  "Miscellaneous expenses",
];

export default function FinancialsShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Financials</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4 leading-tight">
              Know Where Your Business Stands.
            </h2>
            <p className="text-[#888] text-base leading-relaxed mb-6">
              Revenue, expenses, payments and profit — connected to the work that generated them. Not a spreadsheet you maintain by hand.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-white">
                  <Check className="w-4 h-4 text-[#C8A95E] shrink-0" strokeWidth={2.5} />
                  {f}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative">
              <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
              <div className="relative">
                <FinancePreview />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}