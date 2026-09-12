import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";
import LeadsCRMPreview from "@/components/landing/previews/LeadsCRMPreview";
import ProjectsPreview from "@/components/landing/previews/ProjectsPreview";
import FinancePreview from "@/components/landing/previews/FinancePreview";
import TeamPreview from "@/components/landing/previews/TeamPreview";

const blocks = [
  {
    eyebrow: "DASHBOARD",
    title: "Booked, collected, and still owed — on one screen.",
    desc: "Total revenue against what has actually arrived, what is still to collect, and exactly which of your team you owe money to today.",
    Preview: DashboardPreview,
    color: "#F58220",
  },
  {
    eyebrow: "LEAD CRM",
    title: "Nobody falls through the cracks.",
    desc: "Every enquiry with its stage, source and owner, and overdue follow-ups in red so the ones going cold are the ones you see first.",
    Preview: LeadsCRMPreview,
    color: "#2D7FF9",
  },
  {
    eyebrow: "PROJECTS",
    title: "Package, received, balance and profit, per event.",
    desc: "One row per booking showing what they agreed, what they have paid, what is outstanding and what you actually kept.",
    Preview: ProjectsPreview,
    color: "#8B2BE2",
  },
  {
    eyebrow: "FINANCE",
    title: "Revenue, wages, expenses, overhead, net profit.",
    desc: "A real profit and loss statement built from your own bookings and payments, not a spreadsheet you maintain by hand.",
    Preview: FinancePreview,
    color: "#0EA5A4",
  },
  {
    eyebrow: "TEAM",
    title: "Know who's free, who's booked.",
    desc: "Visual availability calendar shows every team member's schedule. Detect double-bookings before they happen.",
    Preview: TeamPreview,
    color: "#F58220",
  },
];

export default function Showcase() {
  return (
    <section id="showcase" className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-logo-gradient" />
            See it in action
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#0B2125] mb-4 leading-tight">
            Polished, purpose-built screens for every part of your day.
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
                {/* Text */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: b.color }}>{b.eyebrow}</div>
                  <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[#0B2125] mb-4 leading-tight">
                    {b.title}
                  </h3>
                  <p className="text-[#666] text-base leading-relaxed mb-6 max-w-md">{b.desc}</p>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
                    style={{ color: b.color }}
                  >
                    Try it free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                {/* Mockup */}
                <div className="relative">
                  <div className="absolute -inset-3 rounded-3xl blur-2xl" style={{ backgroundColor: `${b.color}14` }} />
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