import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function LeadsCRMPreview() {
  const columns = [
    { title: "New", count: 3, leads: ["Priya Sharma", "Rohit Gupta", "Neha Singh"] },
    { title: "Contacted", count: 5, leads: ["Amit Kumar", "Sneha Rao"] },
    { title: "Qualified", count: 2, leads: ["Vikram Patel"] },
    { title: "Won", count: 4, leads: ["Ankit Verma", "Divya Reddy"] },
  ];

  return (
    <BrowserFrame url="www.kramasha.com/leads">
      <MockSidebar active="Leads" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Leads Pipeline</h3>
            <p className="text-xs text-[#8A8580]">Track every enquiry from first contact to conversion</p>
          </div>
          <div className="h-8 px-3 rounded-lg bg-[#C8A95E] text-white text-xs font-medium flex items-center">+ New Lead</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {columns.map((col) => (
            <div key={col.title} className="rounded-xl border border-[#E8E3DB] bg-white p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#1A1A1A]">{col.title}</span>
                <span className="text-[10px] text-[#8A8580] bg-[#F5F3EF] rounded-full px-2 py-0.5">{col.count}</span>
              </div>
              <div className="space-y-2">
                {col.leads.map((name, i) => (
                  <div key={i} className="rounded-lg border border-[#E8E3DB] p-2.5">
                    <div className="text-[11px] font-medium text-[#1A1A1A]">{name}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C8A95E]" />
                      <span className="text-[9px] text-[#8A8580]">Wedding · Oct</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}