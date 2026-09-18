import React from "react";
import BrowserFrame from "./BrowserFrame";
import MockSidebar from "./MockSidebar";

export default function QuotationPreview() {
  const items = [
    { name: "Wedding Photography Package", desc: "2 photographers · full day coverage · 500 edited photos", qty: 1, rate: 50000, total: 50000 },
    { name: "Drone Coverage Add-on", desc: "Aerial shots · ceremony & reception", qty: 1, rate: 5000, total: 5000 },
    { name: "Album (Premium)", desc: "30-page hardbound album", qty: 2, rate: 4000, total: 8000 },
  ];

  const subtotal = 63000;
  const gst = 11340;
  const grandTotal = 74340;

  return (
    <BrowserFrame url="kramasha.com/quotation">
      <MockSidebar active="Quotations" />
      <div className="flex-1 p-6 overflow-hidden bg-[#F5F3EF]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Quotation #QT-2026-001</h3>
            <p className="text-xs text-[#8A8580]">Client: Priya Sharma · Valid until Nov 15, 2026</p>
          </div>
          <div className="flex gap-2">
            <div className="h-8 px-3 rounded-lg border border-[#E8E3DB] bg-white text-xs font-medium flex items-center text-[#1A1A1A]">Preview</div>
            <div className="h-8 px-3 rounded-lg bg-[#C8A95E] text-white text-xs font-medium flex items-center">Send</div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DB] bg-white p-5">
          <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-[#E8E3DB]">
            <div>
              <div className="text-[9px] font-semibold text-[#8A8580] uppercase mb-1">From</div>
              <div className="text-xs font-semibold text-[#1A1A1A]">Kramasha</div>
              <div className="text-[10px] text-[#8A8580]">Mumbai, Maharashtra</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-[#8A8580] uppercase mb-1">Bill To</div>
              <div className="text-xs font-semibold text-[#1A1A1A]">Priya Sharma</div>
              <div className="text-[10px] text-[#8A8580]">Wedding · Oct 15-17, 2026</div>
            </div>
          </div>
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b border-[#E8E3DB]">
                <th className="text-left text-[9px] font-semibold text-[#8A8580] uppercase pb-2">Item</th>
                <th className="text-right text-[9px] font-semibold text-[#8A8580] uppercase pb-2">Qty</th>
                <th className="text-right text-[9px] font-semibold text-[#8A8580] uppercase pb-2">Rate</th>
                <th className="text-right text-[9px] font-semibold text-[#8A8580] uppercase pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-[#E8E3DB]/50">
                  <td className="py-2.5">
                    <div className="text-[11px] font-medium text-[#1A1A1A]">{item.name}</div>
                    <div className="text-[9px] text-[#8A8580]">{item.desc}</div>
                  </td>
                  <td className="text-right text-[11px] text-[#1A1A1A] py-2.5">{item.qty}</td>
                  <td className="text-right text-[11px] text-[#1A1A1A] py-2.5">₹{item.rate.toLocaleString("en-IN")}</td>
                  <td className="text-right text-[11px] font-semibold text-[#1A1A1A] py-2.5">₹{item.total.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-48 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8A8580]">Subtotal</span>
                <span className="font-medium text-[#1A1A1A]">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8A8580]">GST (18%)</span>
                <span className="font-medium text-[#1A1A1A]">₹{gst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E8E3DB]">
                <span className="text-sm font-bold text-[#1A1A1A]">Grand Total</span>
                <span className="text-sm font-bold text-[#C8A95E]">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}