import { Card } from "@/components/ui/card";
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";

export default function EventFinancialCards({ received, paid, leftBalance, profit, currency }) {
  const cards = [
    {
      label: "RECEIVED",
      value: formatMoney(received, currency),
      icon: ArrowDownCircle,
      iconBg: "bg-success/10 text-success",
      valueClass: "text-success",
    },
    {
      label: "PAID",
      value: formatMoney(paid, currency),
      icon: ArrowUpCircle,
      iconBg: "bg-warning/10 text-warning",
      valueClass: "text-warning",
    },
    {
      label: "LEFT BALANCE",
      value: formatMoney(leftBalance, currency),
      icon: Wallet,
      iconBg: "bg-warning/10 text-warning",
      valueClass: "text-warning",
    },
    {
      label: "PROFIT",
      value: formatMoney(profit, currency),
      icon: TrendingUp,
      iconBg: "bg-success/10 text-success",
      valueClass: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 border-2 border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.iconBg)}>
              <c.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{c.label}</span>
          </div>
          <div className={cn("text-lg font-bold", c.valueClass)}>{c.value}</div>
        </Card>
      ))}
    </div>
  );
}