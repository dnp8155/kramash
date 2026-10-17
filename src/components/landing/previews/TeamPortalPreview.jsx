import React from "react";
import { CalendarCheck, Wallet, Briefcase, MapPin, Clock } from "lucide-react";
import BrowserFrame from "./BrowserFrame";

export default function TeamPortalPreview() {
  const stats = [
    { label: "TOTAL BOOKINGS", value: "12", icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "THIS MONTH", value: "3", icon: Briefcase, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "EARNINGS", value: "₹68K", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];
  const upcoming = [
    { title: "Wedding — Rahul & Priya", date: "Oct 15–17", venue: "Udaipur", role: "Lead Photographer" },
    { title: "Corporate — TechCorp", date: "Oct 22", venue: "Mumbai", role: "Second Shooter" },
  ];

  return (
    <BrowserFrame url="www.kramasha.com">
      <div className="flex-1 p-5 bg-[#F5F3EF] overflow-hidden">
        <div className="mb-4">
          <div className="text-[10px] text-[#8A8580] uppercase tracking-wide">Team Portal</div>
          <div className="text-sm font-bold text-[#1A1A1A]">Welcome, Arjun Singh</div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[#E8E3DB] bg-white p-2.5">
              <div className={`w-6 h-6 rounded-md ${s.bg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-3 h-3 ${s.color}`} strokeWidth={1.75} />
              </div>
              <div className="text-[8px] font-semibold text-[#8A8580] uppercase tracking-wide">{s.label}</div>
              <div className="text-sm font-bold text-[#1A1A1A] mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#E8E3DB] bg-white p-3.5 mb-3">
          <div className="text-xs font-semibold text-[#1A1A1A] mb-2.5">Upcoming Schedule</div>
          <div className="space-y-2.5">
            {upcoming.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#C8A95E]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#C8A95E]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#1A1A1A] truncate">{e.title}</div>
                  <div className="text-[9px] text-[#8A8580] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{e.date}</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{e.venue}</span>
                  </div>
                  <span className="inline-block mt-1 text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{e.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E3DB] bg-white p-3.5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-[#1A1A1A]">This Month's Payout</div>
            <span className="text-[10px] font-semibold text-emerald-600">Paid</span>
          </div>
          <div className="text-sm font-bold text-[#1A1A1A]">₹22,000</div>
        </div>
      </div>
    </BrowserFrame>
  );
}
