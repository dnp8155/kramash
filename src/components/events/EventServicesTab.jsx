import { Plus, Briefcase } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import ServiceAssignmentCard from "@/components/events/ServiceAssignmentCard";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

export default function EventServicesTab({
  event, services, serviceAssignments, currency,
  transactions, membersById = {},
  onAddService, onRemoveService, onEditService, onAddPayment, onShareService,
  onRefresh
}) {
  const term = useBusinessTerminology();
  const activeAssignments = (serviceAssignments || []).filter((a) => a.assignment_status !== "removed");

  return (
    <div className="space-y-4">
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