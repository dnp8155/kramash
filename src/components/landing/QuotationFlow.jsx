import React from "react";
import { FileText, Eye, PenTool, CalendarCheck, Receipt, Wallet, BarChart3, ArrowRight, ArrowDown } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const FLOW = [
  { icon: FileText, label: "Quotation", desc: "Create & send" },
  { icon: Eye, label: "Client Reviews", desc: "Online portal" },
  { icon: PenTool, label: "E-Sign", desc: "Digital acceptance" },
  { icon: CalendarCheck, label: "Event Created", desc: "Auto-synced" },
  { icon: Receipt, label: "Milestone Invoice", desc: "Generated" },
  { icon: Wallet, label: "Payment Received", desc: "Tracked" },
  { icon: BarChart3, label: "Financials Updated", desc: "Real-time" },
];

export default function QuotationFlow() {
  return (
    <section className="py-20 sm:py-28 bg-[#F5F3EF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Connected Workflow</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            From Quotation to Payment — Without the Spreadsheet Chaos.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Every step connected. Every payment tracked. Every financial updated automatically.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex flex-col lg:flex-row items-stretch gap-3">
            {FLOW.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex-1 rounded-xl border border-[#E8E3DB] bg-white p-4 text-center min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#C8A95E]/10 flex items-center justify-center mx-auto mb-3">
                    <step.icon className="w-5 h-5 text-[#C8A95E]" strokeWidth={1.75} />
                  </div>
                  <div className="text-xs font-semibold text-[#1A1A1A]">{step.label}</div>
                  <div className="text-[10px] text-[#8A8580] mt-0.5">{step.desc}</div>
                </div>
                {i < FLOW.length - 1 && (
                  <div className="flex items-center justify-center">
                    <ArrowRight className="hidden lg:block w-5 h-5 text-[#C8A95E] shrink-0" />
                    <ArrowDown className="lg:hidden w-5 h-5 text-[#C8A95E] shrink-0" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}