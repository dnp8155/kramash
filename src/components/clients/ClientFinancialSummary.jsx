import { Users, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import { formatCurrency } from "@/utils/format";

export default function ClientFinancialSummary({ totalEvents, contractValue, received, outstanding }) {
  const stats = [
    {
      label: "Total Events",
      value: totalEvents,
      icon: Users,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "Contract Value",
      value: formatCurrency(contractValue),
      icon: TrendingUp,
      iconClass: "bg-info/10 text-info",
    },
    {
      label: "Total Received",
      value: formatCurrency(received),
      icon: Wallet,
      iconClass: "bg-success/10 text-success",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding),
      icon: AlertCircle,
      iconClass: outstanding > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardBody className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.iconClass}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="truncate text-lg font-semibold text-foreground">{s.value}</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}