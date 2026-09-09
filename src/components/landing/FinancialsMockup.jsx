import { TrendingUp, Clock, Wallet, IndianRupee } from "lucide-react";

const STATS = [
  { label: "Received", value: "₹82,450", icon: TrendingUp, tone: "bg-success/10 text-success" },
  { label: "Pending", value: "₹40,000", icon: Clock, tone: "bg-warning/10 text-warning" },
  { label: "Total Paid", value: "₹22,000", icon: Wallet, tone: "bg-info/10 text-info" },
  { label: "Profit", value: "₹60,450", icon: IndianRupee, tone: "bg-success/10 text-success" },
];

const MONTHS = [
  { month: "Apr", value: 35 },
  { month: "May", value: 52 },
  { month: "Jun", value: 68 },
  { month: "Jul", value: 45 },
  { month: "Aug", value: 78 },
  { month: "Sep", value: 82 },
];

const TRANSACTIONS = [
  { type: "Client Receipt", client: "Sharma Family", amount: "+₹40,000", tone: "text-success" },
  { type: "Team Payment", client: "Arjun Patel", amount: "-₹12,000", tone: "text-muted-foreground" },
  { type: "Business Expense", client: "Equipment Rental", amount: "-₹5,000", tone: "text-muted-foreground" },
  { type: "Client Receipt", client: "IIT Bombay", amount: "+₹20,000", tone: "text-success" },
];

export default function FinancialsMockup() {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">Financial Overview</h4>
          <p className="text-[10px] text-muted-foreground">FY 2026-27 · All work items</p>
        </div>
        <span className="rounded-md bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          This Year
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tone}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-base font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-4 rounded-xl border border-border p-4">
        <p className="mb-3 text-xs font-semibold text-foreground">Monthly Revenue</p>
        <div className="flex h-24 items-end justify-between gap-2">
          {MONTHS.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t bg-primary/80 transition-all"
                style={{ height: `${m.value}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-foreground">Recent Transactions</p>
        <div className="space-y-1.5">
          {TRANSACTIONS.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-foreground">{t.type}</p>
                <p className="text-[10px] text-muted-foreground">{t.client}</p>
              </div>
              <span className={`text-xs font-semibold ${t.tone}`}>{t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}