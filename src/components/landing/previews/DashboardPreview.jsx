import React from "react";
import { TrendingUp, CalendarCheck, Wallet, Users } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function DashboardPreview() {
  const stats = [
    { label: "REVENUE", value: "₹18.4L", sub: "+24%", icon: TrendingUp },
    { label: "UPCOMING", value: "7", sub: "this week", icon: CalendarCheck },
    { label: "OUTSTANDING", value: "₹2.1L", sub: "3 due", icon: Wallet },
    { label: "ACTIVE LEADS", value: "42", sub: "+8 today", icon: Users },
  ];

  const chartData = [40, 55, 35, 70, 50, 80, 65, 90];
  const events = [
    { title: "Wedding — Rahul & Priya", date: "Oct 15-17", value: "₹1.2L" },
    { title: "Corporate — TechCorp", date: "Oct 22", value: "₹80K" },
    { title: "Pre-Wedding — Ankit & Sneha", date: "Nov 5", value: "₹45K" },
  ];

  return (
    <BrowserFrame>
      <MockSidebar active="Dashboard" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#1A1A1A]">Good morning, Studio</h3>
          <p className="text-xs text-[#8A8580]">Here's what's happening today</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[#E8E3DB] bg-white p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#C8A95E]/10 flex items-center justify-center">
                  <s.icon className="w-3.5 h-3.5 text-[#C8A95E]" strokeWidth={1.75} />
                </div>
                <span className="text-[9px] font-semibold text-[#8A8580] uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-[#1A1A1A]">{s.value}</span>
                <span className="text-[10px] text-[#3FC85E] font-medium">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E8E3DB] bg-white p-4">
            <div className="text-xs font-semibold text-[#1A1A1A] mb-3">Revenue Trend</div>
            <div className="flex items-end gap-1.5 h-24">
              {chartData.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-[#C8A95E]/60" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-[#8A8580]">
              <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#E8E3DB] bg-white p-4">
            <div className="text-xs font-semibold text-[#1A1A1A] mb-3">Upcoming Events</div>
            <div className="space-y-2.5">
              {events.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[#1A1A1A] truncate">{e.title}</div>
                    <div className="text-[10px] text-[#8A8580]">{e.date}</div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#C8A95E]">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}