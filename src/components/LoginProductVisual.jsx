import React from "react";
import { LayoutGrid, CalendarDays, Users, UserCircle, Wallet, FileText, Search } from "lucide-react";
import Logo from "@/components/common/Logo";

const projects = [
  { name: "Residence Renovation", client: "Sharma Studios", date: "Aug 12", status: "In Progress", tone: "progress" },
  { name: "Wedding Coverage — Mehra", client: "Mehra Family", date: "Sep 18", status: "Upcoming", tone: "upcoming" },
  { name: "Corporate Summit 2026", client: "TechCorp India", date: "Jul 28", status: "Completed", tone: "completed" },
  { name: "Brand Film Project", client: "Lumen Agency", date: "Aug 05", status: "In Progress", tone: "progress" },
];

const navItems = [
  { icon: LayoutGrid, active: false },
  { icon: CalendarDays, active: true },
  { icon: Users, active: false },
  { icon: UserCircle, active: false },
  { icon: Wallet, active: false },
  { icon: FileText, active: false },
];

const badgeClasses = {
  progress: "bg-badge-progress-bg text-badge-progress-fg",
  upcoming: "bg-badge-upcoming-bg text-badge-upcoming-fg",
  completed: "bg-badge-completed-bg text-badge-completed-fg",
};

export default function LoginProductVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center px-8 py-10 xl:px-12 xl:py-14">
      {/* Soft ambient glow behind the interface */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/[0.03] blur-3xl" />

      {/* App interface — cropped on right edge for editorial feel */}
      <div className="relative w-[112%] -mr-[12%] rounded-2xl shadow-2xl shadow-slate-400/15 border border-slate-200/50 overflow-hidden bg-card">
        <div className="flex h-[460px] xl:h-[500px]">
          {/* Sidebar */}
          <div className="w-12 bg-sidebar flex flex-col items-center py-4 gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden">
              <Logo size={18} />
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

          {/* Main content */}
          <div className="flex-1 bg-background p-5 overflow-hidden">
            {/* Page header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Workspace
                </div>
                <div className="text-[15px] font-bold text-foreground tracking-tight mt-0.5">Projects</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-muted border border-border">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <div className="w-16 h-2 rounded-full bg-muted-foreground/20" />
                </div>
              </div>
            </div>

            {/* Project rows */}
            <div className="space-y-2">
              {projects.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-foreground truncate">{p.name}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{p.client}</div>
                  </div>
                  <div className="text-[9px] text-muted-foreground hidden xl:block tabular-nums">{p.date}</div>
                  <div
                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${badgeClasses[p.tone]}`}
                  >
                    {p.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle summary row */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">This month</div>
              <div className="flex items-center gap-3">
                <div className="text-[9px] text-muted-foreground">Received</div>
                <div className="text-[11px] font-bold text-foreground tabular-nums">₹84,200</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}