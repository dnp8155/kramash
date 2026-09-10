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
    if (status === "booked") return "bg-primary/80 text-primary-foreground";
    return "bg-success/10 text-success/70";
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-foreground">Team Availability</div>
          <div className="text-[10px] text-muted-foreground">October 2026 · Week 2</div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded bg-success/40" /> Available
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded bg-primary/80" /> Booked
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-1.5 mb-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase" />
          {days.map((d) => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground uppercase text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Member rows */}
        {members.map((m, i) => (
          <div key={i} className="grid grid-cols-8 gap-1.5 mb-1.5 last:mb-0">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-foreground truncate">{m.name}</div>
              <div className="text-[9px] text-muted-foreground truncate">{m.role}</div>
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
        <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <span className="text-warning text-xs font-bold">!</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-foreground">Scheduling conflict detected</div>
            <div className="text-[10px] text-muted-foreground">Rahul Kumar is double-booked on Thursday</div>
          </div>
        </div>
      </div>
    </div>
  );
}