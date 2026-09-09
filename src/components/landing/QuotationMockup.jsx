import { Check } from "lucide-react";

const ITEMS = [
  { name: "Wedding Photography", qty: 1, rate: 45000, total: 45000 },
  { name: "Cinematic Video", qty: 1, rate: 25000, total: 25000 },
  { name: "Premium Album (30 pages)", qty: 2, rate: 8000, total: 16000 },
];

export default function QuotationMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
      {/* Header */}
      <div className="border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              K
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Kramashah Studio</p>
              <p className="text-[10px] text-muted-foreground">Mumbai · GSTIN 27ABCDE1234F1Z5</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quotation</p>
            <p className="text-xs font-medium text-foreground">QT-2026-0042</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Client + dates */}
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Billed To</p>
            <p className="text-sm font-semibold text-foreground">Sharma Family</p>
            <p className="text-xs text-muted-foreground">+91 98765 43210 · Mumbai</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Date</p>
            <p className="text-xs font-medium text-foreground">Oct 15, 2026</p>
            <p className="text-[10px] text-muted-foreground">Valid until: Nov 15, 2026</p>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rate</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    ₹{item.rate.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    ₹{item.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[220px] space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>₹86,000</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount (7%)</span>
              <span>-₹6,000</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>CGST 9%</span>
              <span>₹7,200</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>SGST 9%</span>
              <span>₹7,200</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold text-foreground">
              <span>Grand Total</span>
              <span>₹94,400</span>
            </div>
          </div>
        </div>

        {/* Status footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
            <Check className="h-3.5 w-3.5 text-success" />
          </div>
          <span className="text-xs font-medium text-foreground">Quotation Accepted</span>
          <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            PDF Export Ready
          </span>
        </div>
      </div>
    </div>
  );
}