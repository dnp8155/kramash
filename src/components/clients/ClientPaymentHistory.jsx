import { Receipt } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/utils/format";

export default function ClientPaymentHistory({ payments, events }) {
  const eventMap = new Map((events || []).map((e) => [e.id, e]));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Payment History</CardTitle>
        <span className="text-sm text-muted-foreground">
          {payments.length} {payments.length === 1 ? "payment" : "payments"}
        </span>
      </CardHeader>
      <CardBody className="p-0">
        {payments.length === 0 ? (
          <EmptyState
            title="No payments recorded yet"
            description="Client receipts will appear here once recorded."
            icon={Receipt}
          />
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => {
              const ev = p.event_id ? eventMap.get(p.event_id) : null;
              return (
                <div key={p.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(p.transaction_date)} · {p.payment_method}
                      {ev ? ` · ${ev.title}` : ""}
                      {p.reference_number ? ` · Ref: ${p.reference_number}` : ""}
                    </p>
                    {p.notes && <p className="mt-0.5 text-xs text-muted-foreground">{p.notes}</p>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}