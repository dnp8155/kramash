import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function CalendarPreview() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const dates = Array.from({ length: 35 }, (_, i) => i - 2);
  const events = { 5: 2, 12: 1, 15: 3, 17: 1, 22: 2, 25: 1, 28: 2 };

  return (
    <BrowserFrame url="app.kramashah.com/calendar">
      <MockSidebar active="Events" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">October 2026</h3>
            <p className="text-xs text-[#8A8580]">Events, team schedules and availability</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DB] bg-white p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((d, i) => (
              <div key={i} className="text-[9px] font-semibold text-[#8A8580] uppercase text-center pb-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dates.map((date, i) => {
              const valid = date > 0 && date <= 31;
              const hasEvents = valid && events[date];
              return (
                <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] ${valid ? "text-[#1A1A1A]" : "text-[#E8E3DB]"} ${hasEvents ? "bg-[#C8A95E]/10 border border-[#C8A95E]/20" : "hover:bg-[#F5F3EF]"}`}>
                  <span className={hasEvents ? "font-bold" : ""}>{valid ? date : ""}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(hasEvents, 3) }).map((_, j) => (
                        <div key={j} className="w-1 h-1 rounded-full bg-[#C8A95E]" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}