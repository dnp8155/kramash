import React from "react";
import {
  LayoutGrid, Calendar, Users, User, Wallet, FileText,
  Search, Check, Bell, TrendingUp, IndianRupee, Briefcase,
  Camera, Heart, Building2, Clapperboard,
} from "lucide-react";
import Logo from "@/components/common/Logo";

const projects = [
  { name: "Residence Renovation", client: "Sharma Studios", date: "Aug 12", status: "In Progress", tagClass: "bg-amber-100 text-amber-700", icon: Building2, iconBg: "from-orange-400 to-amber-500" },
  { name: "Wedding Coverage – Mehra", client: "Mehra Family", date: "Sep 18", status: "Upcoming", tagClass: "bg-blue-100 text-blue-700", icon: Heart, iconBg: "from-rose-400 to-pink-500" },
  { name: "Corporate Summit 2026", client: "TechCorp India", date: "Jul 28", status: "Completed", tagClass: "bg-emerald-100 text-emerald-700", icon: Briefcase, iconBg: "from-emerald-400 to-teal-500" },
  { name: "Brand Film Project", client: "Lumen Agency", date: "Aug 05", status: "In Progress", tagClass: "bg-amber-100 text-amber-700", icon: Clapperboard, iconBg: "from-violet-400 to-purple-500" },
];

const navItems = [
  { icon: LayoutGrid },
  { icon: Calendar, active: true },
  { icon: Users },
  { icon: User },
  { icon: Wallet },
  { icon: FileText },
];

const stats = [
  { label: "Revenue", value: "₹84.2k", icon: IndianRupee, accent: "text-emerald-600", bg: "bg-emerald-50", trend: "+12%" },
  { label: "Events", value: "24", icon: Calendar, accent: "text-blue-600", bg: "bg-blue-50", trend: "+3" },
  { label: "Clients", value: "18", icon: Users, accent: "text-violet-600", bg: "bg-violet-50", trend: "+2" },
];

const chartBars = [
  { h: "h-6", color: "bg-blue-200" },
  { h: "h-10", color: "bg-blue-300" },
  { h: "h-14", color: "bg-blue-400" },
  { h: "h-8", color: "bg-blue-300" },
  { h: "h-12", color: "bg-blue-500" },
  { h: "h-16", color: "bg-blue-600" },
  { h: "h-10", color: "bg-blue-400" },
];

export default function LoginPreview() {
  return (
    <div className="hidden lg:flex h-full w-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mini sidebar */}
      <div className="w-[68px] bg-[#16181C] flex flex-col items-center py-5 gap-1.5 relative">
        <div className="mb-5">
          <Logo size={34} className="rounded-xl" />
        </div>
        {navItems.map((item, i) => (
          <div
            key={i}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              item.active ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
            }`}
          >
            <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
            {item.active && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white" />}
          </div>
        ))}
        <div className="mt-auto w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10">
          AS
        </div>
      </div>

      {/* Main preview area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">Workspace</p>
            <h2 className="text-xl font-bold text-[#1A1D21] mt-0.5">Projects</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center relative">
              <Bell className="w-4 h-4 text-slate-500" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-6 h-6 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.accent}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-lg font-bold text-[#1A1D21] leading-none">{s.value}</p>
                <span className={`text-[10px] font-semibold ${s.accent}`}>{s.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Project list */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {projects.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                <p.icon className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1A1D21] truncate leading-tight">{p.name}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.client}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 mb-1">{p.date}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${p.tagClass}`}>
                  {p.status === "Completed" && <Check className="w-2.5 h-2.5 mr-0.5" />}
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">This Month</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-base font-bold text-[#1A1D21]">₹84,200</p>
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                  12%
                </span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-10">
              {chartBars.map((b, i) => (
                <div key={i} className={`w-2 ${b.h} rounded-t-md ${b.color}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}