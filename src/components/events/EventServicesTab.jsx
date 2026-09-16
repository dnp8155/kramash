import { Plus, Briefcase, AlertTriangle } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import ServiceAssignmentCard from "@/components/events/ServiceAssignmentCard";
import FinancialSummaryCards from "@/components/events/FinancialSummaryCards";
import { serviceAssignmentPaid } from "@/lib/financeService";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

export default function EventServicesTab({
  event, services, serviceAssignments, currency,
  contractValue,
  transactions, membersById = {},
  costOverrun,
  onAddService, onRemoveService, onEditService, onAddPayment, onShareService,
  onRefresh
}) {
  const term = useBusinessTerminology();
  const activeAssignments = (serviceAssignments || []).filter((a) => a.assignment_status !== "removed");

  // Services-only financial summary (PART 2): excludes Team Member/Role amounts.
  const serviceTotalRate = activeAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const serviceTotalPaid = activeAssignments.reduce(
    (s, a) => s + serviceAssignmentPaid(transactions, a.id), 0
  );
  const serviceTotalRemaining = Math.max(0, serviceTotalRate - serviceTotalPaid);

  return (
    <div className="space-y-4">
      {costOverrun && (
        <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Team + Service cost ({formatMoney(costOverrun.combined, currency)}) exceeds contract value ({formatMoney(costOverrun.contractValue, currency)}) by {formatMoney(costOverrun.overrun, currency)}</span>
        </div>
      )}
      <FinancialSummaryCards
        totalRate={serviceTotalRate}
        totalPayments={serviceTotalPaid}
        totalRemaining={serviceTotalRemaining}
        currency={currency}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Services</span>
          <span className="text-xs text-muted-foreground">({activeAssignments.length})</span>
        </div>
        <Button size="sm" onClick={onAddService}>
          <Plus className="w-3.5 h-3.5" /> Add Service
        </Button>
      </div>

      {activeAssignments.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No services assigned"
            description={`Add services to this ${term.workItemSingular.toLowerCase()} to track what's included.`}
            action={
              <Button size="sm" onClick={onAddService}>
                <Plus className="w-3.5 h-3.5" /> Add Service
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeAssignments.map((a) => {
            const svc = services.find((s) => s.id === a.service_id);
            return (
              <ServiceAssignmentCard
                key={a.id}
                assignment={a}
                service={svc}
                event={event}
                currency={currency}
                contractValue={contractValue}
                transactions={transactions}
                membersById={membersById}
                onAddPayment={onAddPayment}
                onEdit={onEditService}
                onRemove={onRemoveService}
                onShare={onShareService}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}