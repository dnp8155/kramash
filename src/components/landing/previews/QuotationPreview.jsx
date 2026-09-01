import React from "react";
import Logo from "@/components/common/Logo";

export default function QuotationPreview() {
  const items = [
    { name: "Photography — Full Day", qty: 1, rate: "30,000", amount: "30,000" },
    { name: "Videography — Cinematic", qty: 1, rate: "25,000", amount: "25,000" },
    { name: "Album — Premium 40pg", qty: 2, rate: "15,000", amount: "30,000" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      {/* Quotation header */}
      <div className="bg-sidebar px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
            <Logo size={26} />
          </div>
          <div>
            <div className="text-sm font-bold text-sidebar-foreground">KRAMAS Studio</div>
            <div className="text-[10px] text-sidebar-muted">QUOTATION · QT-2026-0042</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-sidebar-muted">Date</div>
          <div className="text-xs text-sidebar-foreground font-medium">12 Oct 2026</div>
        </div>
      </div>

      {/* Client + items */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Billed To</div>
            <div className="text-sm font-semibold text-foreground">Mr. & Mrs. Sharma</div>
            <div className="text-xs text-muted-foreground">Sharma Wedding · The Leela Palace</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Valid Until</div>
            <div className="text-xs text-foreground font-medium">30 Nov 2026</div>
          </div>
        </div>

        {/* Items table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 px-3 py-2.5 text-xs border-t border-border/60 items-center"
            >
              <div className="col-span-6 font-medium text-foreground">{item.name}</div>
              <div className="col-span-2 text-center text-muted-foreground">{item.qty}</div>
              <div className="col-span-2 text-right text-muted-foreground">₹{item.rate}</div>
              <div className="col-span-2 text-right font-semibold text-foreground">₹{item.amount}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-[220px] space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-medium">₹85,000</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">CGST (9%)</span>
            <span className="text-foreground">₹7,650</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">SGST (9%)</span>
            <span className="text-foreground">₹7,650</span>
          </div>
          <div className="flex justify-between text-sm pt-1.5 border-t border-border">
            <span className="font-bold text-foreground">Grand Total</span>
            <span className="font-bold text-primary">₹1,00,300</span>
          </div>
        </div>
      </div>
    </div>
  );
}