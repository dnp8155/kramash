import React from "react";
import { LayoutGrid, CalendarDays, Users, UserCircle, Wallet, FileText, Search } from "lucide-react";

const navItems = [
  { icon: LayoutGrid, active: false },
  { icon: CalendarDays, active: true },
  { icon: Users, active: false },
  { icon: UserCircle, active: false },
  { icon: Wallet, active: false },
  { icon: FileText, active: false },
];

const details = [
  { label: "Client", value: "Shah Residence" },
  { label: "Timeline", value: "Aug 12 — Sep 04" },
  { label: "Quotation", value: "Finalized · ₹1,00,300" },
  { label: "Received", value: "₹82,450" },
];

const teamAvatars = [
  { initials: "AK", gradient: "from-blue-400 to-blue-600" },
  { initials: "RS", gradient: "from-emerald-400 to-emerald-600" },
  { initials: "MV", gradient: "from-amber-400 to-amber-600" },
  { initials: "JD", gradient: "from-rose-400 to-rose-600" },
];

export default function RegisterProductVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-8 py-10 xl:px-12 xl:py-14">
      {/* Soft ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/[0.03] blur-3xl" />

      {/* App interface — cropped on right edge */}
      <div className="relative w-[112%] -mr-[12%] rounded-2xl shadow-2xl shadow-slate-400/15 border border-slate-200/50 overflow-hidden bg-card">
        <div className="flex h-[440px] xl:h-[470px]">
          {/* Sidebar */}
          <div className="w-12 bg-sidebar flex flex-col items-center py-4 gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shadow-md">
              K
            </div>
            <div className="w-7 h-px bg-sidebar-border my-0.5" />
            {navItems.map((item, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  item.active ? "bg-sidebar-primary/20" : ""
                }`}
              >
                <item.icon
                  className={`w-[15px] h-[15px] ${item.active ? "text-sidebar-primary" : "text-sidebar-muted"}`}
                />
              </div>
            ))}
            <div className="flex-1" />
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sidebar-primary/60 to-accent/60" />
          </div>

          {/* Main content — project detail view */}
          <div className="flex-1 bg-background p-5 overflow-hidden">
            {/* Breadcrumb + header */}
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-3">
              <span>Workspace</span>
              <span className="text-muted-foreground/40">/</span>
              <span>Projects</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">Residence Design</span>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-foreground tracking-tight">Residence Design</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Architecture project</div>
                </div>
              </div>
              <div className="text-[9px] px-2.5 py-1 rounded-full font-medium bg-badge-progress-bg text-badge-progress-fg">
                In Progress
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-2.5">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    {d.label}
                  </span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>

            {/* Team avatars */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Team</span>
              <div className="flex items-center -space-x-1.5">
                {teamAvatars.map((t, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.gradient} ring-2 ring-background flex items-center justify-center text-[8px] font-bold text-white`}
                  >
                    {t.initials}
                  </div>
                ))}
                <span className="text-[10px] text-muted-foreground ml-3 font-medium">4 assigned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle onboarding flow text — unboxed, secondary */}
      <div className="relative mt-5 flex items-center gap-2 text-[11px] text-muted-foreground/60">
        <span className="font-medium text-foreground/70">Create account</span>
        <span className="text-muted-foreground/30">→</span>
        <span>Set up business</span>
        <span className="text-muted-foreground/30">→</span>
        <span>Start managing</span>
      </div>
    </div>
  );
}