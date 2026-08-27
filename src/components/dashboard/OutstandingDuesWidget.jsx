import { formatMoney } from "@/utils/format";
import EmptyState from "@/components/common/EmptyState";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OutstandingDuesWidget({ dues = [], currency = "INR", onClientClick, onSeeAll }) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Outstanding Receivables</h3>
        </div>
        <button onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          Financials <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2">
        {dues.length === 0 ? (
          <div className="py-6">
            <EmptyState
              title="All dues settled"
              description="No outstanding receivables right now."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dues.map(({ client, due }) => (
              <button
                key={client.id}
                onClick={() => onClientClick(client)}
                className="w-full text-left flex items-center justify-between gap-3 p-3 hover:bg-muted rounded-md transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-warning">
                      {(client.name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{client.name}</div>
                    {client.city && <div className="text-xs text-muted-foreground truncate">{client.city}</div>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-warning tabular-nums">{formatMoney(due, currency)}</div>
                  <div className="text-xs text-muted-foreground">due</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}