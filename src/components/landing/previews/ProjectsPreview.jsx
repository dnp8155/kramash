import React from "react";
import { Plus, Download, Upload } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function ProjectsPreview() {
  const projects = [
    { name: "Meera Joshi", date: "13 Aug 2026", pkg: "₹1,62,500", received: "₹48,750", balance: "₹1,13,750", profit: "₹1,44,501" },
    { name: "Vikram Nair", date: "12 Aug 2026", pkg: "₹1,46,250", received: "₹43,875", balance: "₹1,02,375", profit: "₹1,05,250" },
    { name: "Aditya Rao", date: "11 Aug 2026", pkg: "₹1,59,300", received: "₹1,37,790", balance: "₹21,510", profit: "₹1,59,300" },
    { name: "Pooja Iyer", date: "10 Aug 2026", pkg: "₹2,12,400", received: "₹1,00,000", balance: "₹1,12,400", profit: "₹1,90,401" },
    { name: "Praveen Kumar", date: "9 Aug 2026", pkg: "₹2,20,000", received: "₹40,000", balance: "₹1,80,000", profit: "₹1,80,000" },
    { name: "Utsav Patel", date: "2 Aug 2026", pkg: "₹1,62,500", received: "₹40,000", balance: "₹1,22,500", profit: "₹1,04,501" },
  ];

  return (
    <BrowserFrame url="app.kramasha.com/projects">
      <MockSidebar active="Projects" />
      <div className="flex-1 p-5 overflow-hidden bg-[#FDFCF8]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-bold text-[#0B2125]">Projects</div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-[#666] bg-white border border-[#E5E5E5] px-3 py-2 rounded-lg">
              <Download className="w-3 h-3" /> Export
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold bg-[#F58220] text-white px-3 py-2 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 px-3 py-2.5 bg-[#F9F9F9] text-[8px] sm:text-[9px] font-semibold text-[#999] uppercase tracking-wide">
            <div>Project</div>
            <div>Booked</div>
            <div>Package</div>
            <div>Received</div>
            <div>Balance</div>
            <div className="text-right">Net Profit</div>
          </div>
          {projects.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 px-3 py-2.5 border-t border-[#F0F0EE] items-center">
              <div className="text-[11px] font-medium text-[#0B2125] truncate">{p.name}</div>
              <div className="text-[10px] text-[#666]">{p.date}</div>
              <div className="text-[10px] text-[#0B2125] font-medium">{p.pkg}</div>
              <div className="text-[10px] text-[#22A363] font-medium">{p.received}</div>
              <div className="text-[10px] text-[#DC2626] font-medium">{p.balance}</div>
              <div className="text-[10px] text-[#0B2125] font-bold text-right">{p.profit}</div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}