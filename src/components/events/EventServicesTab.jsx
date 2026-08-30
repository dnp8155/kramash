import { Plus, Briefcase, Trash2 } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

export default function EventServicesTab({ event, services, currency, onAddService, onRemoveService }) {
  const term = useBusinessTerminology();
  const selectedServices = (event?.service_ids || [])
    .map((sid) => services.find((s) => s.id === sid))
    .filter(Boolean);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Services</span>
          <span className="text-xs text-muted-foreground">({selectedServices.length})</span>
        </div>
        <Button size="sm" onClick={onAddService}>
          <Plus className="w-3.5 h-3.5" /> Add Service
        </Button>
      </div>

      {selectedServices.length === 0 ? (
        <EmptyState
          title="No services assigned"
          description={`Add services to this ${term.workItemSingular.toLowerCase()} to track what's included.`}
        />
      ) : (
        <div className="divide-y divide-border">
          {selectedServices.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.rate_type} {s.description ? `· ${s.description}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-foreground tabular-nums">
                  {formatMoney(s.default_rate || 0, currency)}
                </div>
                {onRemoveService && (
                  <button
                    onClick={() => onRemoveService(s.id)}
                    className="text-destructive hover:bg-destructive/5 p-1.5 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}