import React from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Wallet,
  FileText,
  Settings,
  TrendingUp,
  Clock,
  MapPin,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
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
    { label: "Received", value: "₹4,82,450", icon: TrendingUp, sub: "+12% this month" },
    { label: "Active Team", value: "8 / 12", icon: Users, sub: "4 available now" },
    { label: "Outstanding", value: "₹64,200", icon: Clock, sub: "3 invoices due" },
  ];

  const events = [
    { title: "Sharma Wedding", date: "12 Oct 2026", venue: "The Leela Palace", status: "Upcoming" },
    { title: "Verma Corporate Gala", date: "18 Oct 2026", venue: "ITC Grand", status: "Upcoming" },
    { title: "Rao Pre-Wedding", date: "25 Oct 2026", venue: "Beach Resort", status: "Confirmed" },
  ];

  const statusStyle = (s) =>
    s === "Confirmed"
      ? "bg-[#F58220]/10 text-[#F58220]"
      : "bg-[#F9F9F9] text-[#666]";

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Browser frame */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl overflow-hidden">
        {/* Browser bar */}
        <div className="h-11 bg-[#F9F9F9] border-b border-[#E5E5E5] flex items-center px-5 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
          <div className="ml-3 flex-1 max-w-xs h-6 rounded-md bg-white border border-[#E5E5E5] text-[10px] text-[#999] flex items-center px-2.5">
            app.kramasha.com/dashboard
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-foreground bg-white px-2.5 py-1 rounded-full border border-[#E5E5E5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            Good morning, Aarav
          </div>
        </div>

        {/* Content: sidebar + main */}
        <div className="flex min-h-[440px]">
          {/* Sidebar */}
          <div className="w-48 bg-[#1A1A1A] shrink-0 p-3 hidden sm:flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5 px-2 py-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <Logo size={22} />
              </div>
              <span className="text-white text-sm font-bold">Kramasha</span>
            </div>
            {navItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  item.active
                    ? "bg-[#F58220] text-white font-medium"
                    : "text-[#999] hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-5 sm:p-6 overflow-hidden bg-white">
            {/* Greeting */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-sm font-semibold text-foreground">Good morning, Aarav</div>
                <div className="text-xs text-[#999] mt-0.5">Saturday, 12 Oct 2026</div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#F58220] bg-[#F58220]/10 px-3 py-1.5 rounded-full">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +12% revenue
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {stats.map((s, i) => (
                <div key={i} className="rounded-xl border border-[#E5E5E5] bg-[#F9F9F9] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center text-[#F58220]">
                      <s.icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="text-[10px] text-[#999] uppercase tracking-wide font-medium">{s.label}</div>
                  <div className="text-xl font-bold text-foreground mt-0.5 leading-none">{s.value}</div>
                  <div className="text-[10px] text-[#999] mt-1.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Event list */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#F9F9F9] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">
                  Upcoming {term.workItemPlural}
                </div>
                <div className="text-[10px] font-medium text-[#F58220]">View all →</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {events.map((e, i) => (
                  <div key={i} className="rounded-lg border border-[#E5E5E5] bg-white p-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-semibold text-foreground leading-tight">{e.title}</div>
                      <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusStyle(e.status)}`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#999] flex items-center gap-1 mb-1.5">
                      <MapPin className="w-2.5 h-2.5 shrink-0" /> {e.venue}
                    </div>
                    <div className="text-[10px] font-medium text-foreground">{e.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflict alert */}
            <div className="mt-3 rounded-xl border border-[#F58220]/20 bg-[#FFF3E8] p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F58220]/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#F58220]" />
              </div>
              <div className="text-[11px] text-foreground">
                <span className="font-semibold">Scheduling conflict:</span>{" "}
                <span className="text-[#666]">Rahul Kumar is double-booked on Thursday.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}