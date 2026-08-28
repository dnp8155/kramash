import React from "react";
import { Link } from "react-router-dom";
import { Check, Camera, PartyPopper, Compass, Wrench } from "lucide-react";

const categories = [
  { icon: Camera, title: "Photography", sub: "Events · Crew · Services" },
  { icon: PartyPopper, title: "Event Management", sub: "Events · Team · Availability" },
  { icon: Compass, title: "Architecture", sub: "Projects · Sites · Project Team" },
  { icon: Wrench, title: "Other Services", sub: "Projects · Custom Roles · Custom Services" },
];

const steps = [
  { num: "1", label: "Create account", active: true },
  { num: "2", label: "Choose business" },
  { num: "3", label: "Setup workspace" },
  { num: "4", label: "Start managing" },
];

const trustPoints = ["Multi-industry workspace", "Optional GST quotations", "Team & financial management"];

export default function RegisterProductPanel() {
  return (
    <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative overflow-hidden bg-sidebar">
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-hover" />
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-sidebar-foreground w-full">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg shadow-lg">
            K
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">Kramashah</span>
        </Link>

        {/* Main content */}
        <div className="max-w-md py-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-primary mb-3">
            YOUR WORKSPACE STARTS HERE
          </div>
          <h2 className="font-heading text-3xl xl:text-[2.25rem] font-bold leading-tight tracking-tight">
            Set up Kramashah around the way you work.
          </h2>
          <p className="mt-4 text-sidebar-muted text-base leading-relaxed">
            Choose your business category, configure your services and team, and start managing work from one connected workspace.
          </p>

          {/* Category cards */}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="rounded-lg bg-sidebar-foreground/[0.06] border border-sidebar-border p-3"
              >
                <cat.icon className="w-4 h-4 text-sidebar-primary mb-2" />
                <div className="text-xs font-semibold text-sidebar-foreground">{cat.title}</div>
                <div className="text-[10px] text-sidebar-muted mt-0.5">{cat.sub}</div>
              </div>
            ))}
          </div>

          {/* Onboarding steps */}
          <div className="mt-6 rounded-xl bg-sidebar-foreground/[0.04] border border-sidebar-border p-4">
            <div className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider mb-3">
              YOUR SETUP JOURNEY
            </div>
            <div className="space-y-2.5">
              {steps.map((s) => (
                <div key={s.num} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      s.active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "bg-sidebar-foreground/10 text-sidebar-muted border border-sidebar-border"
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-sm ${
                      s.active ? "text-sidebar-foreground font-medium" : "text-sidebar-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.active && (
                    <span className="ml-auto text-[10px] text-sidebar-primary font-medium">
                      Current step
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust microcopy */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {trustPoints.map((tp) => (
              <span
                key={tp}
                className="inline-flex items-center gap-1.5 text-[11px] text-sidebar-muted/80"
              >
                <Check className="w-3 h-3 text-sidebar-primary" strokeWidth={3} />
                {tp}
              </span>
            ))}
          </div>
          <p className="text-xs text-sidebar-muted/60">
            © {new Date().getFullYear()} Kramashah. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}