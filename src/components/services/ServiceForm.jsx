import { useState, useEffect, useRef } from "react";
import { usePlan } from "@/hooks/usePlan";
import { freshCapReached } from "@/lib/planGuard";
import { createService } from "@/lib/clientEdgeFunctions";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { SERVICE_RATE_TYPES, GST_RATE_OPTIONS } from "@/constants/quotationConfig";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRelated } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";
import { toast } from "@/components/ui/use-toast";

const empty = {
  name: "",
  description: "",
  default_rate: "",
  rate_type: "Fixed",
  gst_rate: 0,
  sac_code: "",
  status: "active"
};

export default function ServiceForm({
  open,
  onClose,
  onSaved,
  onSaveFailed,
  service = null,
  workspaceId,
  gstEnabled = false
}) {
  const queryClient = useQueryClient();
  const { plan } = usePlan();
  // Plan cap for NEW services, checked on every save (not just when the form opens), so "Save & add more" can't run past it.
  const capSession = useRef({ base: null, added: 0 });
  const [capInfo, setCapInfo] = useState(null);
  const [form, setForm] = useState(empty);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");

  // Fill the form once per open (or when a different service is opened) so list refreshes can't reset typing.
  const loadedKey = useRef(null);
  useEffect(() => {
    const key = open ? (service?.id ?? "new") : null;
    if (key === loadedKey.current) return;
    loadedKey.current = key;
    if (open) {
      setError("");
      capSession.current = { base: null, added: 0 };
      setForm(service ? { ...empty, ...service, default_rate: service.default_rate ?? "" } : empty);
    }
  }, [open, service]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Service name is required.";
    if (form.default_rate !== "" && Number(form.default_rate) < 0) return "Rate cannot be negative.";
    return "";
  };

  // Optimistic save: the list shows the change and the dialog closes straight away,
  // while the write happens in the background. On failure the change is rolled back
  // (onSaveFailed) and an error toast explains why.
  // `another` (new services only): keep the dialog open with a fresh form, so several can be added in a row.
  const handleSubmit = async (e, another = false) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!assertOnline()) return;
    if (!start()) return;
    setError("");
    const payload = {
      workspace_id: workspaceId,
      name: form.name.trim(),
      description: form.description || "",
      default_rate: Number(form.default_rate) || 0,
      rate_type: form.rate_type,
      gst_rate: gstEnabled ? (Number(form.gst_rate) || 0) : 0,
      sac_code: gstEnabled ? form.sac_code || "" : "",
      status: form.status
    };
    const isEdit = !!service?.id;
    if (!isEdit) {
      const reached = await freshCapReached(plan, "max_services", workspaceId, capSession.current);
      if (reached) { setCapInfo(reached); stop(); return; }
      capSession.current.added += 1;
    }
    // New records get their id up front so the optimistic row and the saved row are the same row.
    const id = isEdit ? service.id : crypto.randomUUID();
    onSaved?.({ ...(service || {}), ...payload, id }, { optimistic: true });
    if (another && !isEdit) {
      setForm(empty);
      toast({ title: `${payload.name} added`, description: "Add the next one." });
    } else {
      onClose?.();
    }
    stop();
    try {
      const saved = isEdit
        ? await base44.entities.Service.update(id, payload)
        : await createService({ ...payload, id });
      invalidateRelated(queryClient, "Service");
      onSaved?.(saved);
    } catch (err) {
      const data = err?.data || err;
      let description = err?.message || "Please try again.";
      if (data?.error === "PLAN_LIMIT_REACHED") {
        description = `You've reached the Free Plan service limit (${data.current}/${data.limit}). Upgrade to Pro to create more services.`;
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        description = data.error;
      }
      if (!isEdit) capSession.current.added = Math.max(0, capSession.current.added - 1);
      onSaveFailed?.({ id, previous: isEdit ? service : null });
      toast({ title: isEdit ? "Couldn't save service changes" : "Couldn't add service", description, variant: "destructive" });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{service ? "Edit Service" : "Add Service"}</AppDialogTitle>
          <AppDialogDescription>
            {service ? "Update this service." : "Create a new service for your workspace."}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label>Service Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Service name" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Default Rate</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.default_rate}
                  onChange={(e) => set("default_rate", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Type</Label>
                <Select value={form.rate_type} onChange={(e) => set("rate_type", e.target.value)} className="w-full">
                  {SERVICE_RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
            </div>

            {gstEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>GST Rate (%)</Label>
                  <Select value={form.gst_rate} onChange={(e) => set("gst_rate", Number(e.target.value))} className="w-full">
                    {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>SAC Code</Label>
                  <Input value={form.sac_code} onChange={(e) => set("sac_code", e.target.value)} placeholder="Optional" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            {!service && <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, true)} disabled={saving}>Save &amp; add more</Button>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : service ? "Save Changes" : "Add Service"}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
      <PlanLimitDialog open={!!capInfo} onClose={() => setCapInfo(null)} resource="services" currentUsage={capInfo?.current || 0} limit={capInfo?.limit || 0} />
    </AppDialog>
  );
}