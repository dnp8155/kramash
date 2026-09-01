import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Logo from "@/components/common/Logo";

const chips = ["Photography", "Event Management", "Architecture", "Other Services"];
const workflow = ["Client", "Project / Event", "Team", "Quotation", "Payment"];
const trustPoints = ["Workspace-based access", "GST-ready quotations", "Team & financial tracking"];

export default function AuthProductPanel() {
  return (
    <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative overflow-hidden bg-sidebar">
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-hover" />
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-sidebar-foreground w-full">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <Logo size={32} />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">KRAMAS</span>
        </Link>

        {/* Main content */}
        <div className="max-w-md py-8">
          <h2 className="font-heading text-3xl xl:text-[2.25rem] font-bold leading-tight tracking-tight">
            Your business, organized in one place.
          </h2>
          <p className="mt-4 text-sidebar-muted text-base leading-relaxed">
            From client details to projects, team assignments, quotations and payments — KRAMAS keeps your workflow connected.
          </p>

          {/* Industry chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="px-3 py-1.5 rounded-full bg-sidebar-primary/12 text-sidebar-primary text-xs font-medium border border-sidebar-primary/20"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Mini dashboard preview */}
          <div className="mt-8 rounded-xl bg-sidebar-foreground/[0.06] border border-sidebar-border p-4">
            <div className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider mb-3">
              Dashboard Preview · Demo
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-sidebar-foreground/[0.08] p-3">
                <div className="text-[10px] text-sidebar-muted">Project</div>
                <div className="text-sm font-semibold text-sidebar-foreground mt-0.5">Residence Design</div>
                <div className="text-[10px] text-sidebar-primary mt-1 font-medium">In Progress</div>
              </div>
              <div className="rounded-lg bg-sidebar-foreground/[0.08] p-3">
                <div className="text-[10px] text-sidebar-muted">Received</div>
                <div className="text-sm font-semibold text-sidebar-foreground mt-0.5">₹82,450</div>
                <div className="text-[10px] text-success mt-1 font-medium">This month</div>
              </div>
              <div className="rounded-lg bg-sidebar-foreground/[0.08] p-3">
                <div className="text-[10px] text-sidebar-muted">Quotation</div>
                <div className="text-sm font-semibold text-sidebar-foreground mt-0.5">Accepted</div>
                <div className="text-[10px] text-success mt-1 font-medium">₹1,00,300</div>
              </div>
              <div className="rounded-lg bg-sidebar-foreground/[0.08] p-3">
                <div className="text-[10px] text-sidebar-muted">Team</div>
                <div className="text-sm font-semibold text-sidebar-foreground mt-0.5">6 / 8</div>
                <div className="text-[10px] text-sidebar-primary mt-1 font-medium">Assigned</div>
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div className="mt-6 flex items-center gap-1.5 text-[11px] text-sidebar-muted flex-wrap">
            {workflow.map((step, i) => (
              <React.Fragment key={step}>
                <span className="text-sidebar-foreground/80 font-medium">{step}</span>
                {i < workflow.length - 1 && <span className="text-sidebar-muted/50">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Trust microcopy */}
        <div className="space-y-3">
          <p className="text-xs text-sidebar-muted">One workspace for your day-to-day business operations.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {trustPoints.map((tp) => (
              <span key={tp} className="inline-flex items-center gap-1.5 text-[11px] text-sidebar-muted/80">
                <Check className="w-3 h-3 text-sidebar-primary" strokeWidth={3} />
                {tp}
              </span>
            ))}
          </div>
          <p className="text-xs text-sidebar-muted/60 pt-2">© {new Date().getFullYear()} KRAMAS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}