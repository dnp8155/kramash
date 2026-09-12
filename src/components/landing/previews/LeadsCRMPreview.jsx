import React from "react";
import { Search, Plus, Filter } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function LeadsCRMPreview() {
  const leads = [
    { name: "Meera Joshi", stage: "Meeting Scheduled", stageColor: "bg-[#E0F2FE] text-[#0EA5E9]", source: "Instagram", handler: "Aarav", date: "13 Aug 2026", overdue: true },
    { name: "Vikram Nair", stage: "Quote Shared", stageColor: "bg-[#FFF3E8] text-[#F58220]", source: "Referral", handler: "Aarav", date: "15 Aug 2026", overdue: false },
    { name: "Aditya Rao", stage: "Contacted", stageColor: "bg-[#F0F9FF] text-[#3B82F6]", source: "Website", handler: "Priya", date: "18 Aug 2026", overdue: false },
    { name: "Pooja Iyer", stage: "Negotiation", stageColor: "bg-[#FEF9C3] text-[#CA8A04]", source: "Walk-in", handler: "Aarav", date: "20 Aug 2026", overdue: false },
    { name: "Sneha Reddy", stage: "New Lead", stageColor: "bg-[#FCE7F3] text-[#DB2777]", source: "Google Ads", handler: "Priya", date: "21 Aug 2026", overdue: false },
    { name: "Karan Mehta", stage: "Meeting Scheduled", stageColor: "bg-[#E0F2FE] text-[#0EA5E9]", source: "Instagram", handler: "Aarav", date: "22 Aug 2026", overdue: false },
  ];

  return (
    <BrowserFrame url="app.kramasha.com/leads">
      <MockSidebar active="Leads" />
      <div className="flex-1 p-5 overflow-hidden bg-[#FDFCF8]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-bold text-[#0B2125]">Leads (7)</div>
          <button className="flex items-center gap-1.5 text-xs font-semibold bg-[#F58220] text-white px-3 py-2 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> New Lead
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 flex-1 min-w-[120px]">
            <Search className="w-3.5 h-3.5 text-[#999]" />
            <span className="text-[10px] text-[#999]">Search leads...</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5">
            <Filter className="w-3 h-3 text-[#999]" />
            <span className="text-[10px] text-[#666]">Active (7)</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5">
            <span className="text-[10px] text-[#666]">All sources</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.7fr] gap-2 px-3 py-2.5 bg-[#F9F9F9] text-[9px] font-semibold text-[#999] uppercase tracking-wide">
            <div>Client</div>
            <div>Stage</div>
            <div className="hidden sm:block">Source</div>
            <div>Handled By</div>
            <div className="text-right">Follow Up</div>
          </div>
          {/* Data rows */}
          {leads.map((lead, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.7fr] gap-2 px-3 py-2.5 border-t border-[#F0F0EE] items-center">
              <div className="text-[11px] font-medium text-[#0B2125] truncate">{lead.name}</div>
              <div>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${lead.stageColor}`}>
                  {lead.stage}
                </span>
              </div>
              <div className="hidden sm:block text-[10px] text-[#666]">{lead.source}</div>
              <div className="text-[10px] text-[#666]">{lead.handler}</div>
              <div className={`text-[10px] text-right font-medium ${lead.overdue ? "text-[#DC2626]" : "text-[#666]"}`}>
                {lead.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}