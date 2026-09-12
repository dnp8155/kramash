import React from "react";
import { Check, X } from "lucide-react";

const rows = [
  "Client & lead management",
  "Branded quotation builder",
  "GST invoices & tax breakdown",
  "Team scheduling & conflict detection",
  "Payment milestones & receipts",
  "Per-project profitability reports",
  "Public client project portal",
  "Crew job sheets",
  "Mobile access on the go",
];

export default function ComparisonTable() {
  return (
    <section className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-[#F9F9F9]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            Why Kramasha
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
            Stop paying for ten tools.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            One workspace replaces the spreadsheet stack, the invoice app, the calendar tool and the CRM you barely use.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E5E5] overflow-hidden bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] bg-[#F9F9F9] border-b border-[#E5E5E5]">
            <div className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#999]" />
            <div className="px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-foreground text-center">
              Kramasha
            </div>
            <div className="px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#999] text-center">
              Others
            </div>
          </div>
          {rows.map((row, i) => (
            <div
              key={row}
              className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== rows.length - 1 ? "border-b border-[#E5E5E5]" : ""}`}
            >
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm text-foreground font-medium">{row}</div>
              <div className="px-4 sm:px-8 py-3.5 sm:py-4 flex justify-center">
                <div className="w-6 h-6 rounded-full bg-[#F58220]/10 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-[#F58220]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="px-4 sm:px-8 py-3.5 sm:py-4 flex justify-center">
                <div className="w-6 h-6 rounded-full bg-[#F9F9F9] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-[#CCC]" strokeWidth={2} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}