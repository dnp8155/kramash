import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function FinancePreview() {
  const metrics = [
    { label: "Income", value: "₹18.4L", color: "#3FC85E" },
    { label: "Expenses", value: "₹8.2L", color: "#E84A3F" },
    { label: "Net Profit", value: "₹10.2L", color: "#C8A95E" },
  ];

  const transactions = [
    { desc: "Client Receipt — Rahul & Priya", amount: "+₹60,000", type: "in" },
    { desc: "Team Payment — Amit Kumar", amount: "-₹8,000", type: "out" },
    { desc: "Client Receipt — TechCorp", amount: "+₹80,000", type: "in" },
    { desc: "Misc — Studio Rent", amount: "-₹15,000", type: "out" },
  ];

  return (
    <BrowserFrame url="kramasha.com/financial">
      <MockSidebar active="Finance" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-[#1A1A1A]">Financial Overview</h3>
          <p className="text-xs text-[#8A8580]">FY 2026-27 · April - March</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-[#E8E3DB] bg-white p-4">
              <div className="text-[9px] font-semibold text-[#8A8580] uppercase tracking-wide mb-1">{m.label}</div>
              <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E8E3DB] bg-white p-4">
            <div className="text-xs font-semibold text-[#1A1A1A] mb-3">Revenue vs Expenses</div>
            <div className="flex items-end gap-2 h-28">
              {[60, 45, 70, 50, 80, 55, 75, 65].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-0.5">
                  <div className="rounded-t-md bg-[#C8A95E]/70" style={{ height: `${h}%` }} />
                  <div className="rounded-b-md bg-[#E84A3F]/30" style={{ height: `${h * 0.4}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#E8E3DB] bg-white p-4">
            <div className="text-xs font-semibold text-[#1A1A1A] mb-3">Recent Transactions</div>
            <div className="space-y-2.5">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${t.type === "in" ? "bg-[#3FC85E]/10" : "bg-[#E84A3F]/10"}`}>
                      {t.type === "in" ? <ArrowDownLeft className="w-3 h-3 text-[#3FC85E]" /> : <ArrowUpRight className="w-3 h-3 text-[#E84A3F]" />}
                    </div>
                    <span className="text-[11px] text-[#1A1A1A] truncate">{t.desc}</span>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${t.type === "in" ? "text-[#3FC85E]" : "text-[#E84A3F]"}`}>{t.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}