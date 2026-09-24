import React from "react";
import { LayoutDashboard, CalendarCheck, Wallet, Users } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function MobilePreview() {
  return (
    <div className="w-[200px] rounded-[2rem] border-[3px] border-[#1A1A1A] bg-[#0A0A0A] p-1.5 shadow-2xl shrink-0">
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1A1A1A] rounded-b-xl z-10" />
        <div className="rounded-[1.7rem] bg-[#F5F3EF] overflow-hidden h-[380px] relative">
          <div className="bg-[#0A0A0A] px-3 py-2.5 flex items-center gap-2 pt-4">
            <Logo size={20} />
            <span className="text-white text-[10px] font-bold">Kramasha</span>
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
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] flex items-center justify-around py-2">
            <LayoutDashboard className="w-4 h-4 text-[#C8A95E]" />
            <CalendarCheck className="w-4 h-4 text-[#8A8580]" />
            <div className="w-8 h-8 rounded-full bg-[#C8A95E] flex items-center justify-center">
              <span className="text-white text-xs">+</span>
            </div>
            <Wallet className="w-4 h-4 text-[#8A8580]" />
            <Users className="w-4 h-4 text-[#8A8580]" />
          </div>
        </div>
      </div>
    </div>
  );
}