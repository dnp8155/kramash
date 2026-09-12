import React from "react";
import { CheckCircle2, FileText, CreditCard, Calendar } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function ClientPortalPreview() {
  const milestones = [
    { name: "Advance", amount: "₹20,000", status: "paid" },
    { name: "Event Day", amount: "₹30,000", status: "paid" },
    { name: "Final Handover", amount: "₹24,340", status: "upcoming" },
  ];

  return (
    <div className="rounded-xl border border-[#E8E3DB] bg-white shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E8E3DB] bg-[#F5F3EF]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E84A3F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8A93F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#3FC85E]" />
        </div>
        <div className="flex-1 mx-3 h-6 rounded-md bg-white border border-[#E8E3DB] flex items-center px-2.5">
          <span className="text-[10px] text-[#8A8580] font-mono">portal.kramashah.com/p/QT2026001</span>
        </div>
      </div>
      <div className="bg-[#F5F3EF] p-6 min-h-[420px]">
        <div className="flex items-center gap-2.5 mb-5">
          <Logo size={28} />
          <div>
            <div className="text-sm font-bold text-[#1A1A1A]">Kramasha Studio</div>
            <div className="text-[10px] text-[#8A8580]">Client Portal</div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DB] bg-white p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-[#1A1A1A]">Wedding — Rahul & Priya</div>
              <div className="text-[11px] text-[#8A8580]">Oct 15-17, 2026 · The Grand Palace</div>
            </div>
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#3FC85E]/15 text-[#3FC85E]">Active</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-[#E8E3DB] p-3 text-center">
              <FileText className="w-4 h-4 text-[#C8A95E] mx-auto mb-1" />
              <div className="text-[9px] text-[#8A8580]">Quotation</div>
              <div className="text-[10px] font-semibold text-[#3FC85E]">Accepted</div>
            </div>
            <div className="rounded-lg border border-[#E8E3DB] p-3 text-center">
              <CreditCard className="w-4 h-4 text-[#C8A95E] mx-auto mb-1" />
              <div className="text-[9px] text-[#8A8580]">Paid</div>
              <div className="text-[10px] font-semibold text-[#1A1A1A]">₹50,000</div>
            </div>
            <div className="rounded-lg border border-[#E8E3DB] p-3 text-center">
              <Calendar className="w-4 h-4 text-[#C8A95E] mx-auto mb-1" />
              <div className="text-[9px] text-[#8A8580]">Balance</div>
              <div className="text-[10px] font-semibold text-[#E8A93F]">₹24,340</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DB] bg-white p-5">
          <div className="text-xs font-semibold text-[#1A1A1A] mb-3">Payment Milestones</div>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.status === "paid" ? "bg-[#3FC85E]" : "bg-[#E8E3DB]"}`}>
                  {m.status === "paid" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-[#1A1A1A]">{m.name}</div>
                </div>
                <span className={`text-[11px] font-semibold ${m.status === "paid" ? "text-[#3FC85E]" : "text-[#8A8580]"}`}>{m.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}