import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";
import Logo from "@/components/common/Logo";

export default function QuotationPreview() {
  const items = [
    { name: "Photography — Full Day", qty: 1, rate: "30,000", amount: "30,000" },
    { name: "Videography — Cinematic", qty: 1, rate: "25,000", amount: "25,000" },
    { name: "Album — Premium 40pg", qty: 2, rate: "15,000", amount: "30,000" },
  ];

  return (
    <BrowserFrame url="app.kramasha.com/quotations">
      <MockSidebar active="Quotations" />
      <div className="flex-1 p-6 overflow-hidden bg-[#FDFCF8]">
        {/* Quotation document */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-[#0B2125] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                <Logo size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Kramasha Studio</div>
                <div className="text-[9px] text-[#8FA0A4]">QUOTATION · QT-2026-0042</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-[#8FA0A4]">Date</div>
              <div className="text-[10px] text-white font-medium">12 Oct 2026</div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[9px] text-[#999] uppercase tracking-wide mb-1">Billed To</div>
                <div className="text-xs font-semibold text-[#0B2125]">Mr. & Mrs. Sharma</div>
                <div className="text-[10px] text-[#666]">Sharma Wedding · The Leela Palace</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#999] uppercase tracking-wide mb-1">Valid Until</div>
                <div className="text-[10px] text-[#0B2125] font-medium">30 Nov 2026</div>
              </div>
            </div>

            {/* Items */}
            <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-[#F9F9F9] px-3 py-2 text-[9px] font-semibold text-[#999] uppercase">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] border-t border-[#F0F0EE] items-center">
                  <div className="col-span-6 font-medium text-[#0B2125]">{item.name}</div>
                  <div className="col-span-2 text-center text-[#666]">{item.qty}</div>
                  <div className="col-span-2 text-right text-[#666]">₹{item.rate}</div>
                  <div className="col-span-2 text-right font-semibold text-[#0B2125]">₹{item.amount}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 ml-auto max-w-[200px] space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#666]">Subtotal</span>
                <span className="text-[#0B2125] font-medium">₹85,000</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#666]">CGST (9%)</span>
                <span className="text-[#0B2125]">₹7,650</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#666]">SGST (9%)</span>
                <span className="text-[#0B2125]">₹7,650</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-[#E5E5E5]">
                <span className="font-bold text-[#0B2125]">Grand Total</span>
                <span className="font-bold text-[#F58220]">₹1,00,300</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}