import { useState } from "react";
import { Plus, Pencil, Tag, Loader2 } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/lib/PlanContext";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import PlanLimitReached from "@/components/common/PlanLimitReached";
import ServiceForm from "@/components/services/ServiceForm";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

export default function ServiceManager() {
  const { currentWorkspace } = useWorkspace();
  const { services, loading, createService, updateService } = useServices();
  const { canCreateResource, usage, getLimit, refresh: refreshPlan } = usePlan();
  const servicesLimit = getLimit("max_services");
  const servicesLimitReached = !canCreateResource("services");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const gstEnabled = !!currentWorkspace?.gst_enabled;

  const handleSave = async (data) => {
    if (editing) {
      await updateService(editing.id, data);
    } else {
      try {
        await createService(data);
        // Refresh plan usage so the frontend limit check stays in sync
        // with the actual service count in the database.
        refreshPlan();
      } catch (e) {
        toast({ title: "Cannot add service", description: e?.message, variant: "destructive" });
        throw e;
      }
    }
  };

  const handleToggle = async (svc) => {
    await updateService(svc.id, {
      status: svc.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <>
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Service Rates</h3>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              disabled={servicesLimitReached}
            >
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </div>

          {servicesLimitReached && (
            <div className="px-5 py-4">
              <PlanLimitReached
                resource="service"
                currentUsage={usage.services}
                limit={servicesLimit}
              />
            </div>
          )}
          <div className="p-0">
            {loading ? (
              <LoadingState label="Loading services…" />
            ) : services.length === 0 ? (
              <EmptyState
                title="No services configured yet"
                description="Add your first service to use in estimates and quotations."
                icon={Tag}
              />
            ) : (
              <div className="divide-y divide-border">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.default_rate != null
                          ? `${formatCurrency(s.default_rate)} · ${s.rate_type}`
                          : s.rate_type || "—"}
                        {gstEnabled && s.gst_rate ? ` · GST ${s.gst_rate}%` : ""}
                        {s.sac_code ? ` · SAC ${s.sac_code}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={s.status === "active" ? "Active" : "Inactive"} />
                    <Button variant="outline" size="sm" onClick={() => handleToggle(s)}>
                      {s.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(s);
                        setModalOpen(true);
                      }}
                      title="Edit service"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ServiceForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
        gstEnabled={gstEnabled}
        onSave={handleSave}
      />
    </>
  );
}