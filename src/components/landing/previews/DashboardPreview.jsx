import React from "react";
import { LayoutDashboard, CalendarCheck, Users, Wallet, FileText, Settings } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function DashboardPreview({ terminology: term }) {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: CalendarCheck, label: term.workItemPlural },
    { icon: Users, label: "Clients" },
    { icon: Users, label: term.teamLabel },
    { icon: Wallet, label: "Financial" },
    { icon: FileText, label: "Quotations" },
    { icon: Settings, label: "Settings" },
  ];

  const stats = [
    { label: `Upcoming ${term.workItemPlural}`, value: "3", tone: "primary" },
    { label: "Received", value: "₹82,450", tone: "success" },
    { label: "Outstanding", value: "₹14,200", tone: "warning" },
    { label: "Active Team", value: "8", tone: "info" },
  ];

  const events = [
    { title: "Sharma Wedding", date: "12 Oct 2026", venue: "The Leela Palace", status: "Upcoming" },
    { title: "Verma Corporate Gala", date: "18 Oct 2026", venue: "ITC Grand", status: "Upcoming" },
    { title: "Rao Pre-Wedding Shoot", date: "25 Oct 2026", venue: "Beach Resort", status: "In Progress" },
  ];

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Browser frame */}
      <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Browser bar */}
        <div className="h-9 bg-muted/60 border-b border-border flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <div className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-card border border-border/60 text-[10px] text-muted-foreground flex items-center px-2">
            app.kramashah.com/dashboard
          </div>
        </div>

        {/* Content: sidebar + main */}
        <div className="flex h-[360px] sm:h-[420px]">
          {/* Sidebar */}
          <div className="w-12 sm:w-44 bg-sidebar shrink-0 p-2 sm:p-3 hidden sm:flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-1.5 py-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <Logo size={18} />
              </div>
              <span className="text-sidebar-foreground text-xs font-bold hidden sm:block">Kramashah</span>
            </div>
            {navItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                  item.active
                    ? "bg-sidebar-primary/20 text-sidebar-primary font-medium"
                    : "text-sidebar-muted hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:block">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-3 sm:p-5 overflow-hidden bg-background">
            <div className="text-[11px] sm:text-xs text-muted-foreground mb-3">
              Good morning, Aarav · Saturday, 12 Oct 2026
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
              {stats.map((s, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5 sm:p-3 shadow-xs">
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
                  <div className="text-sm sm:text-lg font-bold text-foreground mt-1 leading-none">{s.value}</div>
                </div>
              ))}
            </div>
            {/* Event list */}
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <div className="text-[11px] sm:text-xs font-semibold text-foreground mb-2">
                {term.workItemPlural}
              </div>
              {events.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-medium text-foreground truncate">{e.title}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {e.date} · {e.venue}
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0 ml-2">
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating data cards */}
      <div className="absolute -bottom-4 -left-2 sm:-left-6 bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
          <span className="text-success font-bold text-xs">₹</span>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Payments Received</div>
          <div className="text-xs font-bold text-foreground">₹82,450</div>
        </div>
      </div>

      <div className="absolute -top-3 -right-2 sm:-right-5 bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Team Available</div>
          <div className="text-xs font-bold text-foreground">8 / 12</div>
        </div>
      </div>
    </div>
  );
}