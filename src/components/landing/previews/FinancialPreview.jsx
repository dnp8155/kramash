import React from "react";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";

export default function FinancialPreview() {
  const stats = [
    { label: "Total Received", value: "₹4,82,450", icon: Wallet, tone: "success" },
    { label: "Pending", value: "₹64,200", icon: AlertCircle, tone: "warning" },
    { label: "Expenses", value: "₹1,98,000", icon: TrendingDown, tone: "danger" },
    { label: "Net Profit", value: "₹2,84,450", icon: TrendingUp, tone: "primary" },
  ];

  const transactions = [
    { desc: "Sharma Wedding — Receipt", type: "in", amount: "+₹50,000", method: "UPI" },
    { desc: "Rahul Kumar — Team Payment", type: "out", amount: "-₹8,000", method: "Bank" },
    { desc: "Verma Gala — Receipt", type: "in", amount: "+₹32,450", method: "Cash" },
    { desc: "Equipment Rental — Expense", type: "out", amount: "-₹12,000", method: "Card" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border">
        <div className="text-sm font-bold text-foreground">Financial Overview</div>
        <div className="text-[10px] text-muted-foreground">Financial Year 2026-27</div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {stats.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
                <s.icon className={`w-3.5 h-3.5 ${
                  s.tone === "success" ? "text-success" :
                  s.tone === "warning" ? "text-warning" :
                  s.tone === "danger" ? "text-destructive" : "text-primary"
                }`} />
              </div>
              <div className="text-base font-bold text-foreground leading-none">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Monthly Revenue</div>
          <div className="flex items-end gap-1.5 h-16">
            {[40, 55, 45, 70, 60, 85, 75, 90, 65, 80, 95, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[8px] text-muted-foreground">
            <span>Apr</span><span>Jul</span><span>Oct</span><span>Mar</span>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Transactions
          </div>
          {transactions.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 border-t border-border/60">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-foreground truncate">{t.desc}</div>
                <div className="text-[9px] text-muted-foreground">{t.method}</div>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-2 ${
                t.type === "in" ? "text-success" : "text-destructive"
              }`}>
                {t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}