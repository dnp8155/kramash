import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { LEAD_SOURCES, LEAD_PRIORITIES, createLead, updateLead } from "@/lib/leadService";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  company: "",
  source: "direct",
  work_type: "",
  budget: 0,
  event_date: "",
  venue: "",
  priority: "medium",
  notes: "",
  follow_up_date: ""
};

export default function LeadForm({ open, onClose, onSaved, lead, workspaceId, teamMembers = [] }) {
  const { toast } = useToast();
  const term = useBusinessTerminology();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(lead ? { ...EMPTY, ...lead } : EMPTY);
    }
  }, [open, lead]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast({ title: "Contact name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        phone: form.phone || "",
        email: form.email || "",
        company: form.company || "",
        source: form.source || "direct",
        work_type: form.work_type || "",
        budget: Number(form.budget) || 0,
        event_date: form.event_date || "",
        venue: form.venue || "",
        priority: form.priority || "medium",
        notes: form.notes || "",
        follow_up_date: form.follow_up_date || "",
        assigned_to: form.assigned_to || ""
      };
      if (lead?.id) {
        await updateLead(lead.id, payload);
        toast({ title: "Lead updated" });
      } else {
        await createLead(payload);
        toast({ title: "Lead created" });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: "Failed to save lead", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead?.id ? "Edit Lead" : "New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="priya@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Company / Organization</Label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Lead Source</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {LEAD_PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{term.workItemSingular} Type Interest</Label>
              <Input value={form.work_type} onChange={(e) => set("work_type", e.target.value)} placeholder="e.g. Wedding, Pre-wedding" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Tentative Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Next Follow-up</Label>
              <Input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Optional" />
            </div>
            {teamMembers.length > 0 && (
              <div className="space-y-1.5 col-span-2">
                <Label>Assign To</Label>
                <select
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                  value={form.assigned_to || ""}
                  onChange={(e) => set("assigned_to", e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Any details about the enquiry..." />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : lead?.id ? "Update Lead" : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}