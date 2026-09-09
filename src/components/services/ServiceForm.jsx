import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { isValidNonNegativeNumber } from "@/utils/quotation";

const RATE_TYPES = ["Fixed", "Per Day", "Per Unit"];
const GST_RATES = [0, 5, 12, 18, 28];

export default function ServiceForm({
  open,
  onClose,
  service,
  gstEnabled,
  onSave,
}) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        name: service?.name || "",
        description: service?.description || "",
        default_rate: service?.default_rate ?? "",
        rate_type: service?.rate_type || "Fixed",
        gst_rate: service?.gst_rate ?? "",
        sac_code: service?.sac_code || "",
        status: service?.status || "active",
      });
      setErr("");
    }
  }, [open, service?.id]);

  if (!open || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr("Service name is required");
      return;
    }
    if (form.default_rate !== "" && !isValidNonNegativeNumber(form.default_rate)) {
      setErr("Default rate must be a non-negative number");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        default_rate: form.default_rate === "" ? null : Number(form.default_rate),
        rate_type: form.rate_type,
        gst_rate: gstEnabled && form.gst_rate !== "" ? Number(form.gst_rate) : null,
        sac_code: form.sac_code.trim(),
        status: form.status,
      });
      onClose();
    } catch (e2) {
      setErr(e2?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? "Edit Service" : "Add Service"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Service Name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Wedding Photography"
          autoFocus
        />
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional description shown on quotations"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Default Rate"
            type="number"
            min="0"
            value={form.default_rate}
            onChange={(e) => set("default_rate", e.target.value)}
            placeholder="0"
          />
          <Select
            label="Rate Type"
            value={form.rate_type}
            onChange={(e) => set("rate_type", e.target.value)}
          >
            {RATE_TYPES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        {gstEnabled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Default GST Rate"
              value={form.gst_rate}
              onChange={(e) => set("gst_rate", e.target.value)}
            >
              <option value="">None</option>
              {GST_RATES.filter((r) => r > 0).map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </Select>
            <Input
              label="SAC Code"
              value={form.sac_code}
              onChange={(e) => set("sac_code", e.target.value.toUpperCase())}
              placeholder="Optional"
              maxLength={10}
            />
          </div>
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {service ? "Save Changes" : "Add Service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}