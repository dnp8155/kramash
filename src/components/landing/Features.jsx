import React from "react";
import { CalendarCheck, FileText, TrendingUp, CheckCircle } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Professional Quotations & GST",
    desc: "Build branded quotations with services, discounts, optional GST breakdowns, terms and polished PDF output without document chaos.",
    mock: (
      <div className="bg-muted/40 rounded-2xl p-4 text-xs font-mono space-y-2 border border-border">
        <div className="flex justify-between font-bold border-b border-border pb-2">
          <span>QUOTATION-QT-2026-0042</span>
          <span className="text-primary">PDF READY</span>
        </div>
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>Photography - Full Day (1 qty)</span>
          <span>₹30,000</span>
        </div>
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>CGST (9%) & SGST (9%)</span>
          <span>₹15,300</span>
        </div>
        <div className="flex justify-between font-bold border-t border-border pt-2">
          <span>Grand Total</span>
          <span>₹1,00,300</span>
        </div>
      </div>
    ),
    tag: "Branded PDF export & tax splits",
  },
  {
    icon: CalendarCheck,
    title: "Team & Availability Matrix",
    desc: "Assign team members, track roles and rates, and identify scheduling conflicts before they become problems with multi-day availability grids.",
    mock: (
      <div className="bg-muted/40 rounded-2xl p-4 text-xs space-y-3 border border-border">
        <div className="flex justify-between items-center font-medium text-foreground">
          <span>October 2026 — Week 2</span>
          <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px]">Conflict Flag</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px]">
          <div className="bg-card border border-border p-1 rounded">M</div>
          <div className="bg-card border border-border p-1 rounded">T</div>
          <div className="bg-card border border-border p-1 rounded">W</div>
          <div className="bg-destructive text-destructive-foreground p-1 rounded font-bold">Th</div>
          <div className="bg-card border border-border p-1 rounded">F</div>
          <div className="bg-card border border-border p-1 rounded">S</div>
          <div className="bg-card border border-border p-1 rounded">Su</div>
        </div>
        <div className="text-[11px] text-muted-foreground">Rahul Kumar: Booked (Double assignment alert on Thursday)</div>
      </div>
    ),
    tag: "Role management & conflict detection",
  },
];

const thirdFeature = {
  icon: TrendingUp,
  title: "Know Your Numbers Without Spreadsheets",
  desc: "Track receipts, team payments, expenses, pending balances, and actual profitability for every single project or event effortlessly.",
  mock: (
    <div className="bg-muted/40 rounded-2xl p-4 border border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-card rounded-xl p-3 border border-border">
        <div className="text-[10px] text-muted-foreground mb-1">NET PROFIT (YTD)</div>
        <div className="text-lg font-bold text-foreground">₹2,84,450</div>
        <div className="text-[10px] text-muted-foreground mt-1">Expenses: ₹1,98,000</div>
      </div>
      <div className="bg-card rounded-xl p-3 border border-border space-y-1.5">
        <div className="text-[10px] font-semibold text-foreground">Recent Transactions</div>
        <div className="flex justify-between text-[10px] border-b border-border pb-1">
          <span className="text-muted-foreground">Sharma (UPI)</span>
          <span className="text-foreground font-bold">+₹50k</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Rahul (Team)</span>
          <span className="text-muted-foreground font-bold">-₹8k</span>
        </div>
      </div>
    </div>
  ),
};

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            Everything you need to manage the work.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            From the first client enquiry to final profitability, your core business workflow stays connected.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-3xl border border-border p-8 shadow-sm flex flex-col justify-between hover-lift"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{f.desc}</p>
                {f.mock}
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-primary mt-5">
                <span>{f.tag}</span>
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Full-width third feature */}
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center mb-6">
                <thirdFeature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground mb-3">{thirdFeature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{thirdFeature.desc}</p>
            </div>
            <div className="lg:col-span-2">{thirdFeature.mock}</div>
          </div>
        </div>
      </div>
    </section>
  );
}