import React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function TeamPreview() {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const members = [
    { name: "Rahul Kumar", role: "Lead Photographer", pattern: ["booked", "available", "available", "booked", "available", "available", "available"] },
    { name: "Priya Singh", role: "Editor", pattern: ["available", "booked", "booked", "available", "available", "available", "available"] },
    { name: "Amit Verma", role: "Drone Operator", pattern: ["available", "available", "available", "available", "booked", "available", "available"] },
    { name: "Sneha Rao", role: "Assistant", pattern: ["booked", "available", "available", "booked", "available", "booked", "available"] },
  ];

  return (
    <BrowserFrame url="www.kramasha.com/team">
      <MockSidebar active="Events" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Team Availability</h3>
            <p className="text-xs text-[#8A8580]">October 2026 · Week 2</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C8A95E]/20" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C8A95E]" /> Booked</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DB] bg-white p-5 mb-4">
          <div className="grid grid-cols-[90px_repeat(7,1fr)] gap-2 mb-3">
            <div />
            {days.map((d) => (
              <div key={d} className="text-[9px] font-semibold text-[#8A8580] uppercase text-center">{d}</div>
            ))}
          </div>
          {members.map((m, i) => (
            <div key={i} className="grid grid-cols-[90px_repeat(7,1fr)] gap-2 mb-2 last:mb-0">
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#1A1A1A] truncate">{m.name}</div>
                <div className="text-[8px] text-[#8A8580] truncate">{m.role}</div>
              </div>
              {m.pattern.map((status, j) => (
                <div key={j} className={`h-9 rounded-md flex items-center justify-center ${status === "booked" ? "bg-[#C8A95E]" : "bg-[#C8A95E]/15"}`}>
                  {status === "booked" ? <X className="w-3.5 h-3.5 text-white" /> : <Check className="w-3.5 h-3.5 text-[#C8A95E]" />}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#E8A93F]/20 bg-[#FFF8E8] px-4 py-3.5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#E8A93F] shrink-0" />
          <span className="text-xs text-[#1A1A1A]">Scheduling conflict: <strong>Rahul Kumar</strong> is double-booked on Thursday.</span>
        </div>
      </div>
    </BrowserFrame>
  );
}