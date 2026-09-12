import React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function TeamPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const members = [
    { name: "Rahul Kumar", role: "Photographer", pattern: ["booked", "free", "free", "booked", "free", "booked", "free"] },
    { name: "Priya Singh", role: "Videographer", pattern: ["free", "booked", "booked", "free", "free", "booked", "free"] },
    { name: "Amit Verma", role: "Drone Operator", pattern: ["free", "free", "free", "booked", "booked", "free", "free"] },
    { name: "Sneha Rao", role: "Editor", pattern: ["booked", "free", "free", "free", "free", "free", "booked"] },
  ];

  return (
    <BrowserFrame url="app.kramasha.com/team">
      <MockSidebar active="Events" />
      <div className="flex-1 p-6 overflow-hidden bg-[#FDFCF8]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-base font-bold text-[#0B2125]">Team Availability</div>
            <div className="text-[10px] text-[#999]">October 2026 · Week 2</div>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1.5 text-[#666]">
              <span className="w-2.5 h-2.5 rounded bg-[#F58220]/20" /> Available
            </span>
            <span className="flex items-center gap-1.5 text-[#666]">
              <span className="w-2.5 h-2.5 rounded bg-[#F58220]" /> Booked
            </span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 mb-4">
          <div className="grid grid-cols-[90px_repeat(7,1fr)] gap-2 mb-3">
            <div />
            {days.map((d) => (
              <div key={d} className="text-[9px] font-semibold text-[#999] uppercase text-center">{d}</div>
            ))}
          </div>
          {members.map((m, i) => (
            <div key={i} className="grid grid-cols-[90px_repeat(7,1fr)] gap-2 mb-2 last:mb-0">
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#0B2125] truncate">{m.name}</div>
                <div className="text-[8px] text-[#999] truncate">{m.role}</div>
              </div>
              {m.pattern.map((status, j) => (
                <div
                  key={j}
                  className={`h-9 rounded-md flex items-center justify-center ${
                    status === "booked" ? "bg-[#F58220]" : "bg-[#F58220]/15"
                  }`}
                >
                  {status === "booked" ? <X className="w-3.5 h-3.5 text-white" /> : <Check className="w-3.5 h-3.5 text-[#F58220]" />}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Conflict alert */}
        <div className="rounded-xl border border-[#F58220]/20 bg-[#FFF3E8] px-4 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#F58220]/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F58220]" />
          </div>
          <div className="text-[10px]">
            <span className="font-semibold text-[#0B2125]">Scheduling conflict:</span>{" "}
            <span className="text-[#666]">Rahul Kumar is double-booked on Thursday.</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}