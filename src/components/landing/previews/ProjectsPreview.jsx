import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function ProjectsPreview() {
  const events = [
    { title: "Wedding — Rahul & Priya", date: "Oct 15-17", venue: "The Grand Palace", contract: "₹1.2L", paid: "₹60K", balance: "₹60K", status: "Upcoming" },
    { title: "Corporate — TechCorp Annual", date: "Oct 22", venue: "Hotel Marriott", contract: "₹80K", paid: "₹80K", balance: "₹0", status: "In Progress" },
    { title: "Pre-Wedding — Ankit & Sneha", date: "Nov 5-6", venue: "Beach Resort", contract: "₹45K", paid: "₹15K", balance: "₹30K", status: "Upcoming" },
  ];

  return (
    <BrowserFrame url="www.kramasha.com/events">
      <MockSidebar active="Events" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Events & Projects</h3>
            <p className="text-xs text-[#8A8580]">Package, received, balance and profit — per event</p>
          </div>
          <div className="h-8 px-3 rounded-lg bg-[#C8A95E] text-white text-xs font-medium flex items-center">+ New Event</div>
        </div>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="rounded-xl border border-[#E8E3DB] bg-white p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#C8A95E]/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#C8A95E]">{e.date.split(" ")[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1A1A1A] truncate">{e.title}</div>
                <div className="text-[11px] text-[#8A8580]">{e.date} · {e.venue}</div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-right">
                <div>
                  <div className="text-[9px] text-[#8A8580] uppercase">Contract</div>
                  <div className="text-xs font-bold text-[#1A1A1A]">{e.contract}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8A8580] uppercase">Paid</div>
                  <div className="text-xs font-bold text-[#3FC85E]">{e.paid}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8A8580] uppercase">Balance</div>
                  <div className="text-xs font-bold text-[#E8A93F]">{e.balance}</div>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${e.status === "In Progress" ? "bg-[#E8A93F]/15 text-[#E8A93F]" : "bg-[#C8A95E]/15 text-[#C8A95E]"}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}