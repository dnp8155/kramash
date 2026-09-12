import React from "react";
import { Check } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import QuotationPreview from "@/components/landing/previews/QuotationPreview";
import TeamPreview from "@/components/landing/previews/TeamPreview";
import FinancialPreview from "@/components/landing/previews/FinancialPreview";
import { getBusinessTerminology } from "@/lib/businessTerminology";

const blocks = [
  {
    eyebrow: "Dashboard",
    title: "Your business at a glance.",
    desc: "Track revenue, active team, outstanding dues and upcoming projects — all on one clean dashboard.",
    points: ["Live revenue & expense stats", "Upcoming events overview", "Scheduling conflict alerts"],
    Preview: () => <DashboardPreview terminology={getBusinessTerminology({ business_category: "PHOTOGRAPHY" })} />,
  },
  {
    eyebrow: "Quotations",
    title: "Branded quotations that close deals.",
    desc: "Build professional quotations with line items, packages, GST breakdowns and payment milestones. Clients sign online.",
    points: ["GST-ready with CGST/SGST & IGST", "Online acceptance & e-signature", "Polished PDF templates"],
    Preview: QuotationPreview,
  },
  {
    eyebrow: "Team",
    title: "Know who's free, who's booked.",
    desc: "Visual availability calendar shows every team member's schedule. Detect double-bookings before they happen.",
    points: ["Weekly availability grid", "Conflict detection", "Role-based assignments"],
    Preview: TeamPreview,
  },
  {
    eyebrow: "Financials",
    title: "Real numbers, real profit.",
    desc: "Track every receipt, team payment and expense. See net profit per project and across your financial year.",
    points: ["Revenue & expense tracking", "Per-project profitability", "Financial year management"],
    Preview: FinancialPreview,
  },
];

export default function Showcase() {
  return (
    <section id="showcase" className="py-20 sm:py-28 border-t border-[#E5E5E5]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#F9F9F9] px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            See it in action
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
            Built for how service businesses actually work.
          </h2>
        </div>

        <div className="space-y-20 sm:space-y-28">
          {blocks.map((b, i) => {
            const reversed = i % 2 === 1;
            return (
              <div
                key={b.eyebrow}
                className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reversed ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#F58220] mb-3">{b.eyebrow}</div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
                    {b.title}
                  </h3>
                  <p className="text-[#666] text-base leading-relaxed mb-6">{b.desc}</p>
                  <ul className="space-y-3">
                    {b.points.map((p) => (
                      <li key={p} className="flex items-center gap-3 text-sm text-foreground">
                        <div className="w-5 h-5 rounded-full bg-[#F58220]/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[#F58220]" strokeWidth={2.5} />
                        </div>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="absolute -inset-3 bg-[#F58220]/5 rounded-3xl blur-2xl" />
                  <div className="relative">
                    <b.Preview />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}