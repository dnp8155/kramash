import React from "react";
import { MessageSquare, Sheet, FileText, StickyNote, Calculator, ArrowRight } from "lucide-react";

const scattered = [
  { icon: MessageSquare, label: "WhatsApp", sub: "Client details" },
  { icon: Sheet, label: "Spreadsheet", sub: "Team availability" },
  { icon: FileText, label: "Documents", sub: "Quotations" },
  { icon: StickyNote, label: "Notes", sub: "Payments" },
  { icon: Calculator, label: "Calculator", sub: "Profit" },
];

const flow = ["Client", "Project / Event", "Team", "Quotation", "Payment", "Profit"];

export default function ProblemSolution() {
  return (
    <section className="py-20 sm:py-24 bg-[#F7F9FC] border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Your business shouldn't run across five different tools.
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: scattered tools */}
          <div className="relative">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 text-center lg:text-left">
              The scattered way
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {scattered.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 text-center shadow-xs opacity-80"
                  style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                >
                  <s.icon className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <div className="text-xs font-semibold text-foreground">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Kramasha workflow */}
          <div>
            <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-6 text-center lg:text-left">
              The Kramasha way
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="space-y-3">
                {flow.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-foreground">{step}</span>
                    </div>
                    {i < flow.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-5 border-t border-border/60">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Kramasha turns the entire workflow into one connected system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}