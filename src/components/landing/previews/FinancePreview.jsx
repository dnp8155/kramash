import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function FinancePreview() {
  const metrics = [
    { label: "Total Revenue", value: "₹10,93,052" },
    { label: "Received on Bookings", value: "₹2,20,218" },
    { label: "Cash Received", value: "₹2,38,218" },
    { label: "Outstanding", value: "₹8,72,833" },
    { label: "Team Wages", value: "₹1,01,549" },
    { label: "Project Expenses", value: "₹52,850" },
    { label: "Gross Profit", value: "₹9,38,053" },
    { label: "Company Overhead", value: "₹47,395" },
    { label: "Net Profit", value: "₹8,90,658" },
    { label: "Avg. Project Value", value: "₹1,91,764" },
  ];

  const plRows = [
    { label: "Revenue (from projects)", value: "₹10,93,052", bold: true },
    { label: "Less: Team Wages", value: "−₹1,01,549" },
    { label: "Less: Project Expenses", value: "−₹52,850" },
    { label: "Gross Profit", value: "₹9,38,053", bold: true },
    { label: "Less: Company Overhead", value: "−₹47,395" },
    { label: "Net Profit", value: "₹8,90,658", bold: true, highlight: true },
  ];

  return (
    <BrowserFrame url="app.kramasha.com/finance">
      <MockSidebar active="Finance" />
      <div className="flex-1 p-5 overflow-hidden bg-[#FDFCF8]">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-[#E5E5E5]">
          {["Overview", "Payments", "Expenses", "Team", "Staff"].map((tab, i) => (
            <div
              key={tab}
              className={`text-[10px] font-medium px-3 py-2 border-b-2 ${
                i === 0 ? "border-[#F58220] text-[#F58220]" : "border-transparent text-[#999]"
              }`}
            >
              {tab}
              {tab === "Payments" && <span className="ml-1 text-[8px] bg-[#F58220] text-white px-1 rounded">NEW</span>}
            </div>
          ))}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-lg border border-[#E5E5E5] bg-white p-2.5">
              <div className="text-[8px] text-[#999] uppercase tracking-wide font-semibold">{m.label}</div>
              <div className="text-sm font-bold text-[#0B2125] mt-0.5 leading-none">{m.value}</div>
            </div>
          ))}
        </div>

        {/* P&L */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F9F9F9] border-b border-[#E5E5E5]">
            <div className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Profit and Loss</div>
            <div className="text-[9px] text-[#999]">The bottom line</div>
          </div>
          {plRows.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-2.5 border-t border-[#F0F0EE] ${
                r.highlight ? "bg-[#FFF3E8]" : ""
              }`}
            >
              <div className={`text-[11px] ${r.bold ? "font-bold text-[#0B2125]" : "text-[#666]"}`}>
                {r.label}
              </div>
              <div className={`text-[11px] ${r.highlight ? "font-bold text-[#F58220]" : r.bold ? "font-bold text-[#0B2125]" : "text-[#666]"}`}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}