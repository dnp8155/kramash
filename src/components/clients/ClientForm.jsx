import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const empty = {
  name: "", phone: "", alternate_phone: "", email: "",
  address: "", city: "", state: "", country: "", notes: ""
};

export default function ClientForm({ open, onClose, onSaved, client = null, workspaceId }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(client ? { ...empty, ...client } : empty);
    }
  }, [open, client]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Client name is required.";
    if (!form.phone.trim() && !form.email.trim()) return "Phone or email is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
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
        phone: form.phone.trim(),
        alternate_phone: form.alternate_phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        notes: form.notes.trim()
      };
      let saved;
      if (client?.id) {
        saved = await base44.entities.Client.update(client.id, payload);
      } else {
        saved = await base44.entities.Client.create(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>
            {client ? "Update client details." : "Create a new client in this workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Client Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Shah" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Mobile number" />
            </div>
            <div className="space-y-1.5">
              <Label>Alternate Phone</Label>
              <Input value={form.alternate_phone} onChange={(e) => set("alternate_phone", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@email.com" />
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : client ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}