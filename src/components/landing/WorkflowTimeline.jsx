import React from "react";
import { User, FolderKanban, CalendarCheck, Users, Briefcase, FileText, Receipt, Wallet, BarChart3, ChevronRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const STEPS = [
  { icon: User, label: "Lead" },
  { icon: FolderKanban, label: "Client" },
  { icon: CalendarCheck, label: "Event" },
  { icon: Users, label: "Team" },
  { icon: Briefcase, label: "Service" },
  { icon: FileText, label: "Quotation" },
  { icon: Receipt, label: "Invoice" },
  { icon: Wallet, label: "Payment" },
  { icon: BarChart3, label: "Financials" },
];

export default function WorkflowTimeline() {
  return (
    <section className="py-20 sm:py-28 bg-[#F5F3EF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Real Workflow</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            One connected workflow. Not ten disconnected apps.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Kramasha keeps every step connected — from the first lead to the final financial report — instead of forcing you to maintain separate spreadsheets and apps.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl border border-[#E8E3DB] bg-white flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-[#C8A95E]" strokeWidth={1.75} />
                  </div>
                  <span className="text-[10px] font-medium text-[#1A1A1A]">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden sm:block w-4 h-4 text-[#C8A95E] mt-[-12px]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}