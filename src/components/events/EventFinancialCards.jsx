import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

export default function EventFinancialCards({ received, paid, leftBalance, profit, currency }) {
  const cards = [
    { label: "Received", value: formatMoney(received, currency), icon: ArrowDownCircle, iconBg: "bg-success/10 text-success", valueClass: "text-success" },
    { label: "Paid", value: formatMoney(paid, currency), icon: ArrowUpCircle, iconBg: "bg-warning/10 text-warning", valueClass: "text-warning" },
    { label: "Left Balance", value: formatMoney(leftBalance, currency), icon: Wallet, iconBg: "bg-warning/10 text-warning", valueClass: "text-warning" },
    { label: "Profit", value: formatMoney(profit, currency), icon: TrendingUp, iconBg: "bg-success/10 text-success", valueClass: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.iconBg)}>
              <c.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
          </div>
          <div className={cn("text-lg font-bold tabular-nums", c.valueClass)}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}