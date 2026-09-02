import { Plus, Briefcase, Trash2, Layers, Crown } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { isSelfMember } from "@/lib/teamService";
import { cn } from "@/lib/utils";

export default function EventServicesTab({
  event, services, serviceAssignments, currency,
  onAddService, onRemoveService,
  membersById = {}
}) {
  const term = useBusinessTerminology();
  const activeAssignments = (serviceAssignments || []).filter((a) => a.assignment_status !== "removed");

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
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
        <EmptyState
          title="No services assigned"
          description={`Add services to this ${term.workItemSingular.toLowerCase()} to track what's included.`}
        />
      ) : (
        <div className="divide-y divide-border">
          {activeAssignments.map((a) => {
            const svc = services.find((s) => s.id === a.service_id);
            return (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    a.is_addon ? "bg-warning/10" : "bg-muted"
                  )}>
                    {a.is_addon
                      ? <Layers className="w-4 h-4 text-warning" />
                      : <Briefcase className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-foreground truncate">
                        {a.service_name_snapshot || svc?.name || "Unknown service"}
                      </div>
                      {a.is_addon && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                          Add-on
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {a.provider_id && isSelfMember(membersById[a.provider_id]) && (
                        <Crown className="w-3 h-3 text-primary shrink-0" />
                      )}
                      {a.provider_name_snapshot ? `Provider: ${a.provider_name_snapshot}` : "No provider"}
                      {a.rate_type ? ` · ${a.rate_type}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className={cn(
                    "text-sm font-semibold tabular-nums",
                    a.is_addon ? "text-warning" : "text-foreground"
                  )}>
                    {formatMoney(a.agreed_rate || 0, currency)}
                  </div>
                  {onRemoveService && (
                    <button
                      onClick={() => onRemoveService(a)}
                      className="text-destructive hover:bg-destructive/5 p-1.5 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}