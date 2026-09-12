import React from "react";
import { MessageSquare, Sheet, FileText, Calculator, CheckCircle } from "lucide-react";

const scattered = [
  { icon: MessageSquare, label: "WhatsApp", sub: "Client details" },
  { icon: Sheet, label: "Spreadsheet", sub: "Team availability" },
  { icon: FileText, label: "Documents", sub: "Quotations" },
  { icon: Calculator, label: "Notes & Calc", sub: "Payments & profit" },
];

const unified = [
  { num: "01", title: "Clients & Projects", desc: "Keep client details and every related project organized in one clean timeline." },
  { num: "02", title: "Team & Availability Matrix", desc: "Assign team members, track roles, and identify conflicts before they become problems." },
  { num: "03", title: "Professional Quotations & GST", desc: "Build branded quotes with automatic tax breakdowns and instant PDF export." },
];

export default function ProblemSolution() {
  return (
    <section id="workflow" className="py-20 sm:py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            Your business shouldn't run across five different tools.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Compare the scattered toolchain against the unified Kramasha approach.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scattered way */}
          <div className="bg-muted/40 rounded-3xl border border-border p-8 sm:p-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-destructive block mb-2">
              The Scattered Way
            </span>
            <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
              Disconnected and chaotic.
            </h3>
            <ul className="space-y-3 text-sm">
              {scattered.map((s, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center bg-card/60 rounded-2xl p-4 border border-border/60"
                >
                  <span className="font-medium flex items-center gap-2 text-foreground">
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kramasha way — dark card */}
          <div className="bg-sidebar text-sidebar-foreground rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-success block mb-2">
                The Kramasha Way
              </span>
              <h3 className="font-heading text-2xl font-semibold text-sidebar-foreground mb-6">
                One connected workspace.
              </h3>
              <div className="space-y-3 text-sm">
                {unified.map((u, i) => (
                  <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="font-semibold mb-1 flex items-center gap-2 text-sidebar-foreground">
                      <CheckCircle className="w-4 h-4 text-success" />
                      {u.num}. {u.title}
                    </div>
                    <div className="text-xs text-sidebar-muted">{u.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}