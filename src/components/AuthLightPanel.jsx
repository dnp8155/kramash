import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Logo from "@/components/common/Logo";

const chips = ["Photography", "Event Management", "Architecture", "Other Services"];
const trustPoints = ["Workspace-based access", "GST-ready quotations", "Team & financial tracking"];

export default function AuthLightPanel() {
  return (
    <div className="relative w-full h-full flex flex-col justify-between px-10 py-10 xl:px-14 xl:py-14">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/[0.03] blur-3xl" />

      <Link to="/" className="relative z-10 flex items-center gap-2.5 self-start hover:opacity-80 transition-opacity">
        <Logo size={32} className="shadow-md" />
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramasha</span>
      </Link>

      <div className="relative z-10 max-w-md py-8">
        <h2 className="font-heading text-3xl xl:text-[2.25rem] font-bold leading-tight tracking-tight text-foreground">
          Your business, organized in one place.
        </h2>
        <p className="mt-4 text-muted-foreground text-base leading-relaxed">
          One workspace for clients, events, teams, payments and finances.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium border border-primary/15">
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-card border border-border p-4 shadow-card">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Dashboard Preview · Demo
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-muted/60 p-3">
              <div className="text-[10px] text-muted-foreground">Project</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">Residence Design</div>
              <div className="text-[10px] text-primary mt-1 font-medium">In Progress</div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <div className="text-[10px] text-muted-foreground">Received</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">₹82,450</div>
              <div className="text-[10px] text-success mt-1 font-medium">This month</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {trustPoints.map((tp) => (
            <span key={tp} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Check className="w-3 h-3 text-primary" strokeWidth={3} />
              {tp}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Kramasha. All rights reserved.</p>
      </div>
    </div>
  );
}