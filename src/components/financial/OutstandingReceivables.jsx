import { useMemo } from "react";
import { formatMoney } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { eventFinancialSummary } from "@/lib/financeService";

// Contract value is the same as on the event page and in Reports: base value + service add-ons + billable extras.
export default function OutstandingReceivables({ events, transactions, clients, currency, serviceAssignments = [] }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const clientsById = {};
    (clients || []).forEach((c) => { clientsById[c.id] = c; });

    const evByClient = {};
    (events || []).forEach((e) => {
      if (!e.client_id || e.settled) return; // settled = owner closed its dues
      if (!evByClient[e.client_id]) evByClient[e.client_id] = [];
      evByClient[e.client_id].push(e);
    });

    const svcByEvent = {};
    serviceAssignments.forEach((x) => { (svcByEvent[x.event_id] ||= []).push(x); });

    const result = [];
    Object.entries(evByClient).forEach(([clientId, evs]) => {
      let contractValue = 0;
      let received = 0;
      let outstanding = 0;
      evs.forEach((e) => {
        const sum = eventFinancialSummary(e, transactions, [], svcByEvent[e.id] || []);
        contractValue += sum.contractValue;
        received += sum.received;
        outstanding += sum.pending;
      });
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
  }, [events, transactions, clients, serviceAssignments]);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="bg-card border border-border rounded-[15px] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">Outstanding Receivables</span>
        </div>
        <span className="text-sm font-bold text-warning tabular-nums shrink-0">
          {formatMoney(totalOutstanding, currency)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No outstanding dues" description="All clients have paid in full." />
        </div>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_24px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Client</span>
            <span className="text-right">Contract</span>
            <span className="text-right">Received</span>
            <span className="text-right">Outstanding</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => {
              return (
                <button
                  key={r.clientId}
                  onClick={() => navigate(`/clients/${r.clientId}`)}
                  className="w-full px-4 py-3 hover:bg-muted/40 text-left"
                >
                  {/* Phone: name and what is due on top, received and contract underneath. */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{r.clientName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.eventCount} event{r.eventCount !== 1 ? "s" : ""}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Due</div>
                        <div className="text-sm font-bold text-warning tabular-nums">{formatMoney(r.outstanding, currency)}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5" />
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">Received <span className="text-success font-medium tabular-nums">{formatMoney(r.received, currency)}</span></span>
                      <span className="text-muted-foreground">of <span className="tabular-nums">{formatMoney(r.contractValue, currency)}</span></span>
                    </div>
                  </div>

                  {/* From sm up: the table row, unchanged. */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_24px] gap-4 items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{r.clientName}</div>
                      <div className="text-xs text-muted-foreground">{r.eventCount} event{r.eventCount !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground tabular-nums">{formatMoney(r.contractValue, currency)}</div>
                    <div className="text-right text-sm text-success tabular-nums">{formatMoney(r.received, currency)}</div>
                    <div className="text-right text-sm font-semibold text-warning tabular-nums">{formatMoney(r.outstanding, currency)}</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground justify-self-end" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}