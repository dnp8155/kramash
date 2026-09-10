import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { formatCurrency } from "@/utils/format";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";

// Displays payment milestones (dues) for a quotation.
// Milestones are created on quotation acceptance and their paid_amount
// is updated when actual CLIENT_RECEIPT payments are recorded.
export default function PaymentMilestoneList({ quotationId }) {
  const { workspaceId } = useWorkspace();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !quotationId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.PaymentMilestone.filter(
          { workspace_id: workspaceId, quotation_id: quotationId },
          "sort_order",
          50
        );
        setMilestones(list || []);
      } catch {
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, quotationId]);

  if (loading) return <LoadingState label="Loading milestones…" className="py-4" />;

  if (milestones.length === 0) {
    return (
      <p className="py-3 text-xs text-muted-foreground">
        No payment milestones. Add milestones in the quotation editor to track payment dues.
      </p>
    );
  }

  const totalDue = milestones.reduce((s, m) => s + (m.amount || 0), 0);
  const totalPaid = milestones.reduce((s, m) => s + (m.paid_amount || 0), 0);

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{m.label}</p>
            <p className="text-xs text-muted-foreground">
              {m.percentage}% · {formatCurrency(m.amount)}
              {m.paid_amount > 0 && (
                <span className="text-success"> · Paid {formatCurrency(m.paid_amount)}</span>
              )}
            </p>
          </div>
          <StatusBadge status={m.status} />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Total Paid / Due</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(totalPaid)} / {formatCurrency(totalDue)}
        </span>
      </div>
    </div>
  );
}