import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, X } from "lucide-react";
import Input from "@/components/common/Input";

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
    <div className="space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name *" autoFocus disabled={saving} />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" disabled={saving} />
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" disabled={saving} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover disabled:opacity-50">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><Check className="w-3.5 h-3.5" /> Add</>}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}