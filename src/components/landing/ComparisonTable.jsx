import React from "react";
import { Check, X } from "lucide-react";

const rows = [
  { capability: "CRM & lead pipeline", others: "Excel + WhatsApp" },
  { capability: "Project management", others: "Trello / Notion" },
  { capability: "Finance & profit tracking", others: "Separate software" },
  { capability: "Team & payouts", others: "Spreadsheets" },
  { capability: "Event calendar", others: "Google Calendar" },
  { capability: "Quotation builder", others: "Word / PDF" },
  { capability: "Client portal", others: "Manual emails" },
];

export default function ComparisonTable() {
  return (
    <section className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-[#FDFCF8]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#F58220] mb-3">Why Kramasha</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#0B2125] mb-4 leading-tight">
            Stop paying for ten tools. Start using{" "}
            <span className="text-[#F58220]">one.</span>
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            Everything scattered across Excel, WhatsApp, Google Calendar, Trello, Notion, Drive and separate accounting software, unified.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E5E5] overflow-hidden bg-[#F9F7F2]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] bg-white border-b border-[#E5E5E5]">
            <div className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#999]" />
            <div className="px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#0B2125] text-center">
              Kramasha
            </div>
            <div className="px-4 sm:px-8 py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#999] text-center">
              Others
            </div>
          </div>
          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.capability}
              className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== rows.length - 1 ? "border-b border-[#E5E5E5]" : ""}`}
            >
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm text-[#0B2125] font-medium">{row.capability}</div>
              <div className="px-4 sm:px-8 py-3.5 sm:py-4 flex justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#22A363]/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#22A363]" strokeWidth={2.5} />
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-[#0B2125]">Yes</span>
                </div>
              </div>
              <div className="px-4 sm:px-8 py-3.5 sm:py-4 flex justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#A64E41]/10 flex items-center justify-center">
                    <X className="w-3 h-3 text-[#A64E41]" strokeWidth={2.5} />
                  </div>
                  <span className="hidden sm:inline text-xs text-[#999]">{row.others}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}