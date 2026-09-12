import React from "react";
import { TrendingUp, Wallet, Users, AlertCircle } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function DashboardPreview() {
  const stats = [
    { label: "TOTAL REVENUE", value: "₹10,93,052", icon: TrendingUp, sub: "+24% this year" },
    { label: "RECEIVED ON BOOKINGS", value: "₹2,20,218", icon: Wallet, sub: "18 receipts" },
    { label: "OUTSTANDING", value: "₹8,72,833", icon: AlertCircle, sub: "7 invoices due" },
    { label: "CASH RECEIVED", value: "₹2,38,218", icon: Users, sub: "This month" },
  ];

  const chartData = [45, 60, 50, 75, 65, 90];

  return (
    <BrowserFrame url="app.kramasha.com/dashboard">
      <MockSidebar active="Dashboard" />
      <div className="flex-1 p-6 overflow-hidden bg-[#FDFCF8]">
        {/* Greeting */}
        <div className="mb-6">
          <div className="text-base font-bold text-[#0B2125]">Good morning, Aarav.</div>
          <div className="text-xs text-[#999] mt-0.5">Saturday, 12 Oct 2026</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-[#E5E5E5] bg-white p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#F58220]/10 flex items-center justify-center">
                  <s.icon className="w-3.5 h-3.5 text-[#F58220]" strokeWidth={1.75} />
                </div>
              </div>
              <div className="text-[9px] text-[#999] uppercase tracking-wide font-semibold">{s.label}</div>
              <div className="text-lg font-bold text-[#0B2125] mt-0.5 leading-none">{s.value}</div>
              <div className="text-[9px] text-[#999] mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Payments Received</div>
            <div className="text-[10px] text-[#999]">Last 6 months</div>
          </div>
          <div className="flex items-end gap-2 h-20">
            {chartData.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#F58220]" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[8px] text-[#999]">
            <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}