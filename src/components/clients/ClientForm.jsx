import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { toast } from "@/components/ui/use-toast";

const empty = {
  name: "",
  phone: "",
  alternate_phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  notes: "",
};

export default function ClientForm({ open, onClose, client, onSave }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(client ? { ...empty, ...client } : empty);
  }, [open, client?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      toast({
        title: "Phone or email is required",
        description: "Add at least one contact detail.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        alternate_phone: form.alternate_phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country,
        notes: form.notes.trim(),
      });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Edit Client" : "New Client"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {client ? "Save Changes" : "Add Client"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Client Name"
          name="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Mobile Number"
          name="phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+91 98200 11223"
        />
        <Input
          label="Alternate Phone"
          name="alternate_phone"
          value={form.alternate_phone}
          onChange={(e) => set("alternate_phone", e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Input
          label="City"
          name="city"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
        />
        <Input
          label="Address"
          name="address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="State"
          name="state"
          value={form.state}
          onChange={(e) => set("state", e.target.value)}
        />
        <Input
          label="Country"
          name="country"
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
        />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Any notes about this client…"
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </Modal>
  );
}