import { useMemo } from "react";
import { formatMoney } from "@/utils/format";
import { Wallet, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Client 360° financial summary: aggregates contract value, received,
// outstanding, and event counts across all of a client's events.
export default function ClientFinancialSummary({ events, transactions, currency }) {
  const summary = useMemo(() => {
    const evIds = new Set((events || []).map((e) => e.id));
    const evTx = (transactions || []).filter(
      (t) => t.status === "ACTIVE" && evIds.has(t.event_id)
    );
    const contractValue = (events || []).reduce(
      (s, e) => s + (Number(e.contract_value) || 0), 0
    );
    const received = evTx
      .filter((t) => t.transaction_type === "CLIENT_RECEIPT")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outstanding = Math.max(0, contractValue - received);
    const completed = (events || []).filter((e) => e.status === "completed").length;
    const upcoming = (events || []).filter((e) => e.status === "upcoming").length;
    return { contractValue, received, outstanding, completed, upcoming, total: events.length };
  }, [events, transactions]);

  const cards = [
    {
      label: "Total Contract Value",
      value: formatMoney(summary.contractValue, currency),
      icon: TrendingUp,
      tone: "default"
    },
    {
      label: "Received",
      value: formatMoney(summary.received, currency),
      icon: Wallet,
      tone: "success"
    },
    {
      label: "Outstanding",
      value: formatMoney(summary.outstanding, currency),
      icon: AlertCircle,
      tone: summary.outstanding > 0 ? "warning" : "default"
    },
    {
      label: "Total Events",
      value: `${summary.total} (${summary.upcoming} upcoming)`,
      icon: Calendar,
      tone: "default"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            <c.icon className={cn(
              "w-4 h-4",
              c.tone === "success" ? "text-success" :
              c.tone === "warning" ? "text-warning" :
              "text-muted-foreground"
            )} />
          </div>
          <div className={cn(
            "text-lg font-bold tabular-nums",
            c.tone === "success" ? "text-success" :
            c.tone === "warning" ? "text-warning" :
            "text-foreground"
          )}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}