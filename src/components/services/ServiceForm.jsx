import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { SERVICE_RATE_TYPES, GST_RATE_OPTIONS } from "@/constants/quotationConfig";

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
  service = null,
  workspaceId,
  gstEnabled = false
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(service ? { ...empty, ...service, default_rate: service.default_rate ?? "" } : empty);
    }
  }, [open, service]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Service name is required.";
    if (form.default_rate !== "" && Number(form.default_rate) < 0) return "Rate cannot be negative.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
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
      let saved;
      if (service?.id) {
        saved = await base44.entities.Service.update(service.id, payload);
      } else {
        saved = await base44.entities.Service.create(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            {service ? "Update this service." : "Create a new service for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Service Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wedding Photography" autoFocus />
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : service ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}