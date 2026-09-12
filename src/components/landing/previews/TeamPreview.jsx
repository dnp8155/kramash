import React from "react";
import { Check, X } from "lucide-react";

export default function TeamPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const members = [
    { name: "Rahul Kumar", role: "Photographer", pattern: ["booked", "free", "free", "booked", "free", "booked", "free"] },
    { name: "Priya Singh", role: "Videographer", pattern: ["free", "booked", "booked", "free", "free", "booked", "free"] },
    { name: "Amit Verma", role: "Drone Operator", pattern: ["free", "free", "free", "booked", "booked", "free", "free"] },
    { name: "Sneha Rao", role: "Editor", pattern: ["booked", "free", "free", "free", "free", "free", "booked"] },
  ];

  const cellColor = (status) => {
    if (status === "booked") return "bg-[#F58220] text-white";
    return "bg-[#F58220]/10 text-[#F58220]";
  };

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-foreground">Team Availability</div>
          <div className="text-[10px] text-[#999]">October 2026 · Week 2</div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-[#666]">
            <span className="w-2.5 h-2.5 rounded bg-[#F58220]/30" /> Available
          </span>
          <span className="flex items-center gap-1.5 text-[#666]">
            <span className="w-2.5 h-2.5 rounded bg-[#F58220]" /> Booked
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-1.5 mb-2">
          <div className="text-[10px] font-semibold text-[#999] uppercase" />
          {days.map((d) => (
            <div key={d} className="text-[10px] font-semibold text-[#999] uppercase text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Member rows */}
        {members.map((m, i) => (
          <div key={i} className="grid grid-cols-8 gap-1.5 mb-1.5 last:mb-0">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-foreground truncate">{m.name}</div>
              <div className="text-[9px] text-[#999] truncate">{m.role}</div>
            </div>
            {m.pattern.map((status, j) => (
              <div
                key={j}
                className={`h-8 rounded-md flex items-center justify-center text-[9px] font-medium ${cellColor(status)}`}
              >
                {status === "booked" ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Conflict alert */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-[#FFF3E8] border border-[#F58220]/20 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#F58220]/20 flex items-center justify-center shrink-0">
            <span className="text-[#F58220] text-xs font-bold">!</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-foreground">Scheduling conflict detected</div>
            <div className="text-[10px] text-[#666]">Rahul Kumar is double-booked on Thursday</div>
          </div>
        </div>
      </div>
    </div>
  );
}