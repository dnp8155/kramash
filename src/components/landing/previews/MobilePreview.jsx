import React from "react";
import { Bell, Bot, Search, CalendarDays, UserCheck, Wallet, CircleEllipsis, Plus, Signal, Wifi, BatteryFull } from "lucide-react";
import Logo from "@/components/common/Logo";

// Mirrors the real in-app mobile layout: light top bar with search + bell,
// and the floating glass pill bottom nav with a separate "+" action button —
// see src/components/layout/TopHeader.jsx and MobileNavigation.jsx.
// `profile` (optional, see heroProfiles.js) swaps the work-item word, numbers, list and revenue bars.
// Without it the preview shows the original photography sample, exactly as before.
export default function MobilePreview({ profile }) {
  const plural = profile?.plural || "Events";
  const upcoming = profile?.upcoming || ["Wedding — Rahul & Priya", "Corporate — TechCorp"];
  return (
    <div className="relative shrink-0 w-[220px]">
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-[84px] h-5 w-[3px] rounded-l bg-[#3A3A3C]" />
      <span className="absolute -left-[3px] top-[120px] h-9 w-[3px] rounded-l bg-[#3A3A3C]" />
      <span className="absolute -left-[3px] top-[164px] h-9 w-[3px] rounded-l bg-[#3A3A3C]" />
      <span className="absolute -right-[3px] top-[130px] h-14 w-[3px] rounded-r bg-[#3A3A3C]" />
      <span className="absolute -right-[3px] top-[236px] h-8 w-[3px] rounded-r bg-[#3A3A3C]" />

      {/* Titanium frame with thin, even bezels */}
      <div className="rounded-[2.9rem] p-[3px] bg-gradient-to-b from-[#8E8E93] via-[#4A4A4D] to-[#8E8E93] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]">
        <div className="rounded-[2.75rem] bg-black p-[5px]">
          <div className="relative rounded-[2.35rem] bg-[#F5F3EF] overflow-hidden h-[440px]">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[68px] h-[20px] rounded-full bg-black z-20 flex items-center justify-end pr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14142B] ring-1 ring-[#1f2a44]" />
            </div>
            {/* Status bar */}
            <div className="absolute top-0 inset-x-0 h-9 px-5 flex items-center justify-between z-10 text-[#1A1A1A]">
              <span className="text-[9px] font-semibold tracking-tight">9:41</span>
              <div className="flex items-center gap-1">
                <Signal className="w-2.5 h-2.5" strokeWidth={2.5} />
                <Wifi className="w-2.5 h-2.5" strokeWidth={2.5} />
                <BatteryFull className="w-3 h-3" strokeWidth={2} />
              </div>
            </div>
            <div className="h-9" />
          <div className="bg-white/90 border-b border-[#E8E3DB] px-3 pt-1 pb-2 flex items-center gap-2">
            <Logo size={18} />
            <div className="flex-1 flex items-center gap-1 bg-[#F5F3EF] border border-[#E8E3DB] rounded-full px-2 py-1">
              <Search className="w-2.5 h-2.5 text-[#8A8580]" />
              <span className="text-[7px] text-[#8A8580]">Search</span>
            </div>
            <Bot className="w-3 h-3 text-[#8A8580] shrink-0" />
            <Bell className="w-3 h-3 text-[#8A8580] shrink-0" />
          </div>
          <div key={profile?.id || "default"} className={`p-3 space-y-2.5 ${profile ? "animate-fade-in" : ""}`}>
            <div className="text-[10px] font-bold text-[#1A1A1A]">Good morning</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#E8E3DB] bg-white p-2">
                <div className="text-[8px] text-[#8A8580] uppercase">Revenue</div>
                <div className="text-sm font-bold text-[#1A1A1A]">{profile?.revenue || "₹18.4L"}</div>
              </div>
              <div className="rounded-lg border border-[#E8E3DB] bg-white p-2">
                <div className="text-[8px] text-[#8A8580] uppercase">{plural}</div>
                <div className="text-sm font-bold text-[#1A1A1A]">{profile?.count || "7"}</div>
              </div>
            </div>
            <div className="rounded-lg border border-[#E8E3DB] bg-white p-2.5">
              <div className="text-[9px] font-semibold text-[#1A1A1A] mb-1.5">{profile ? `Upcoming ${plural}` : "Upcoming"}</div>
              {upcoming.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="text-[9px] text-[#1A1A1A] truncate pr-2">{t}</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8A95E] shrink-0" />
                </div>
              ))}
            </div>
            {profile && (
              <div className="rounded-lg border border-[#E8E3DB] bg-white p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-semibold text-[#1A1A1A]">Revenue trend</span>
                  <span className="text-[8px] font-semibold text-emerald-600">+{profile.growth}</span>
                </div>
                <div className="flex items-end gap-1 h-7">
                  {profile.chart.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-[#C8A95E] transition-[height] duration-500" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-3 right-3 flex items-end gap-1">
            <div className="flex-1 flex items-stretch gap-0.5 bg-white/90 backdrop-blur-sm border border-[#E8E3DB] rounded-full p-0.5 shadow-md">
              {[
                { icon: CalendarDays, active: true },
                { icon: UserCheck },
                { icon: Wallet },
                { icon: CircleEllipsis },
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
            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-[3px] rounded-full bg-[#1A1A1A]/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
