import React from "react";
import { Bell, Bot, Search, CalendarDays, UserCheck, Wallet, MoreHorizontal, Plus } from "lucide-react";
import Logo from "@/components/common/Logo";

// Mirrors the real in-app mobile layout: light top bar with search + bell,
// and the floating glass pill bottom nav with a separate "+" action button —
// see src/components/layout/TopHeader.jsx and MobileNavigation.jsx.
export default function MobilePreview() {
  return (
    <div className="w-[200px] rounded-[2rem] border-[3px] border-[#1A1A1A] bg-[#0A0A0A] p-1.5 shadow-2xl shrink-0">
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1A1A1A] rounded-b-xl z-10" />
        <div className="rounded-[1.7rem] bg-[#F5F3EF] overflow-hidden h-[380px] relative">
          <div className="bg-white/90 border-b border-[#E8E3DB] px-3 pt-4 pb-2 flex items-center gap-2">
            <Logo size={18} />
            <div className="flex-1 flex items-center gap-1 bg-[#F5F3EF] border border-[#E8E3DB] rounded-full px-2 py-1">
              <Search className="w-2.5 h-2.5 text-[#8A8580]" />
              <span className="text-[7px] text-[#8A8580]">Search</span>
            </div>
            <Bot className="w-3 h-3 text-[#8A8580] shrink-0" />
            <Bell className="w-3 h-3 text-[#8A8580] shrink-0" />
          </div>
          <div className="p-3 space-y-2.5">
            <div className="text-[10px] font-bold text-[#1A1A1A]">Good morning</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#E8E3DB] bg-white p-2">
                <div className="text-[8px] text-[#8A8580] uppercase">Revenue</div>
                <div className="text-sm font-bold text-[#1A1A1A]">₹18.4L</div>
              </div>
              <div className="rounded-lg border border-[#E8E3DB] bg-white p-2">
                <div className="text-[8px] text-[#8A8580] uppercase">Events</div>
                <div className="text-sm font-bold text-[#1A1A1A]">7</div>
              </div>
            </div>
            <div className="rounded-lg border border-[#E8E3DB] bg-white p-2.5">
              <div className="text-[9px] font-semibold text-[#1A1A1A] mb-1.5">Upcoming</div>
              {["Wedding — Rahul & Priya", "Corporate — TechCorp"].map((t, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="text-[9px] text-[#1A1A1A] truncate pr-2">{t}</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8A95E] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-2.5 left-2 right-2 flex items-end gap-1">
            <div className="flex-1 flex items-stretch gap-0.5 bg-white/90 backdrop-blur-sm border border-[#E8E3DB] rounded-full p-0.5 shadow-md">
              {[
                { icon: CalendarDays, active: true },
                { icon: UserCheck },
                { icon: Wallet },
                { icon: MoreHorizontal },
              ].map(({ icon: Icon, active }, i) => (
                <div
                  key={i}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-full ${active ? "bg-[#1A1A1A]/5" : ""}`}
                >
                  <Icon className={`w-2.5 h-2.5 ${active ? "text-[#1A1A1A]" : "text-[#8A8580]"}`} />
                </div>
              ))}
            </div>
            <div className="shrink-0 w-6 h-6 rounded-full bg-[#C8A95E] flex items-center justify-center shadow-md">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
