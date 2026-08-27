import { useMemo } from "react";
import { formatMoney } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";

// Shows clients with outstanding receivables (contract value minus received)
// across all their events. Sorted by highest outstanding first.
export default function OutstandingReceivables({ events, transactions, clients, currency }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const clientsById = {};
    (clients || []).forEach((c) => { clientsById[c.id] = c; });

    const evByClient = {};
    (events || []).forEach((e) => {
      if (!e.client_id) return;
      if (!evByClient[e.client_id]) evByClient[e.client_id] = [];
      evByClient[e.client_id].push(e);
    });

    const evTxMap = {};
    (transactions || []).forEach((t) => {
      if (t.status !== "ACTIVE" || t.transaction_type !== "CLIENT_RECEIPT") return;
      if (!evTxMap[t.event_id]) evTxMap[t.event_id] = 0;
      evTxMap[t.event_id] += Number(t.amount) || 0;
    });

    const result = [];
    Object.entries(evByClient).forEach(([clientId, evs]) => {
      const contractValue = evs.reduce((s, e) => s + (Number(e.contract_value) || 0), 0);
      const received = evs.reduce((s, e) => s + (evTxMap[e.id] || 0), 0);
      const outstanding = Math.max(0, contractValue - received);
      if (outstanding <= 0) return;
      result.push({
        clientId,
        clientName: clientsById[clientId]?.name || "Unknown",
        contractValue,
        received,
        outstanding,
        eventCount: evs.length
      });
    });
    return result.sort((a, b) => b.outstanding - a.outstanding);
  }, [events, transactions, clients]);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">Outstanding Receivables</span>
        </div>
        <span className="text-sm font-bold text-warning tabular-nums">
          {formatMoney(totalOutstanding, currency)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No outstanding dues" description="All clients have paid in full." />
        </div>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_24px] gap-4 px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Client</span>
            <span className="text-right">Contract</span>
            <span className="text-right">Received</span>
            <span className="text-right">Outstanding</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <button
                key={r.clientId}
                onClick={() => navigate(`/clients/${r.clientId}`)}
                className="w-full grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_24px] gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/40 text-left items-center"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.clientName}</div>
                  <div className="text-xs text-muted-foreground">{r.eventCount} event{r.eventCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex sm:block justify-between">
                  <span className="sm:hidden text-xs text-muted-foreground">Contract</span>
                  <span className="text-sm text-muted-foreground sm:text-right tabular-nums">{formatMoney(r.contractValue, currency)}</span>
                </div>
                <div className="flex sm:block justify-between">
                  <span className="sm:hidden text-xs text-muted-foreground">Received</span>
                  <span className="text-sm text-success sm:text-right tabular-nums">{formatMoney(r.received, currency)}</span>
                </div>
                <div className="flex sm:block justify-between">
                  <span className="sm:hidden text-xs text-muted-foreground">Due</span>
                  <span className="text-sm font-semibold text-warning sm:text-right tabular-nums">{formatMoney(r.outstanding, currency)}</span>
                </div>
                <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground justify-self-end" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}