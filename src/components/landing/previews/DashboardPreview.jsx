import React from "react";
import { LayoutDashboard, CalendarCheck, Users, Wallet, FileText, Settings, TrendingUp, Clock, MapPin, AlertTriangle } from "lucide-react";
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
    { label: "RECEIVED", value: "₹82,450", icon: TrendingUp, tone: "primary" },
    { label: "ACTIVE TEAM", value: "8 / 12", icon: Users, tone: "purple" },
    { label: "OUTSTANDING", value: "₹14,200", icon: Clock, tone: "red" },
  ];

  const events = [
    { title: "Sharma Wedding", date: "12 Oct 2026", venue: "The Leela Palace", status: "Upcoming" },
    { title: "Verma Corporate Gala", date: "18 Oct 2026", venue: "ITC Grand", status: "Upcoming" },
    { title: "Rao Pre-Wedding", date: "25 Oct 2026", venue: "Beach Resort", status: "In Progress" },
  ];

  const toneStyles = {
    primary: "bg-[#F58220]/10 text-[#F58220]",
    purple: "bg-[#F9F9F9] text-foreground",
    red: "bg-[#F9F9F9] text-foreground",
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Browser frame */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden">
        {/* Browser bar */}
        <div className="h-10 bg-[#F9F9F9] border-b border-[#E5E5E5] flex items-center px-5 gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          <div className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-white border border-[#E5E5E5] text-[10px] text-[#999] flex items-center px-2">
            app.kramasha.com/dashboard
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-foreground bg-[#F9F9F9] px-2.5 py-1 rounded-full border border-[#E5E5E5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            Good morning, Aarav
          </div>
        </div>

        {/* Content: sidebar + main */}
        <div className="flex h-auto sm:h-[400px]">
          {/* Sidebar */}
          <div className="w-44 bg-[#1A1A1A] shrink-0 p-3 hidden sm:flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-1.5 py-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <Logo size={18} />
              </div>
              <span className="text-white text-xs font-bold">Kramasha</span>
            </div>
            {navItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  item.active
                    ? "bg-[#F58220] text-white font-medium"
                    : "text-[#999] hover:text-white"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-5 overflow-hidden bg-white">
            <div className="text-xs text-[#999] mb-4">
              Good morning, Aarav · Saturday, 12 Oct 2026
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {stats.map((s, i) => (
                <div key={i} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#999] uppercase tracking-wide font-medium">{s.label}</div>
                    <div className="text-xl font-bold text-foreground mt-1 leading-none">{s.value}</div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toneStyles[s.tone]}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
            {/* Event list */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 mb-3">
              <div className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-3">
                Upcoming {term.workItemPlural}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {events.map((e, i) => (
                  <div key={i} className="rounded-xl border border-[#E5E5E5] bg-white p-3">
                    <div className="text-xs font-semibold text-foreground">{e.title}</div>
                    <div className="text-[10px] text-[#999] mt-1 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {e.venue}
                    </div>
                    <div className={`text-[10px] font-medium mt-2 ${e.status === "In Progress" ? "text-[#999]" : "text-[#F58220]"}`}>
                      {e.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Conflict alert */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <div className="text-[11px] text-destructive">
                <span className="font-bold">Scheduling conflict detected:</span> Rahul Kumar is double-booked on Thursday.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}