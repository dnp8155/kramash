import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, X } from "lucide-react";
import Input from "@/components/common/Input";
import { Label } from "@/components/ui/label";

export default function QuickClientForm({ workspaceId, onSaved, onCancel }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await base44.entities.Client.create({
        workspace_id: workspaceId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim()
      });
      onSaved?.(created);
    } catch (e) {
      setError(e?.message || "Failed to add client.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">Quick Add Client</p>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground" disabled={saving}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Name <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" autoFocus disabled={saving} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" disabled={saving} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" disabled={saving} />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground">You can add full details later from the Clients page.</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover disabled:opacity-50">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><Check className="w-3.5 h-3.5" /> Add Client</>}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}