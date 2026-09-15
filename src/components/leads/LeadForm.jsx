import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" }
];

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" }
];

const PRIORITIES = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" }
];

const empty = {
  name: "",
  phone: "",
  email: "",
  source: "other",
  event_type: "",
  event_date: "",
  budget: "",
  status: "new",
  priority: "warm",
  next_followup_date: "",
  notes: ""
};

export default function LeadForm({ open, onClose, editingLead, onSaved }) {
  const { workspaceId, workspace } = useWorkspace();
  const term = getBusinessTerminology(workspace);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const { saving, start, stop } = useSubmitGuard();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editingLead) {
        setForm({
          ...empty,
          ...editingLead,
          budget: editingLead.budget || "",
          event_date: editingLead.event_date || "",
          next_followup_date: editingLead.next_followup_date || ""
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, editingLead]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: false }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = true;
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = true;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!start()) return;
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        phone: form.phone?.trim() || "",
        email: form.email?.trim() || "",
        source: form.source,
        event_type: form.event_type?.trim() || "",
        event_date: form.event_date || "",
        budget: Number(form.budget) || 0,
        status: form.status,
        priority: form.priority,
        next_followup_date: form.next_followup_date || "",
        notes: form.notes?.trim() || ""
      };

      if (editingLead) {
        await base44.entities.Lead.update(editingLead.id, payload);
        toast({ title: "Lead updated successfully" });
      } else {
        await base44.entities.Lead.create(payload);
        toast({ title: "Lead created successfully" });
      }
      invalidateEntity(queryClient, "Lead");
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: "Failed to save lead", variant: "destructive" });
    } finally {
      stop();
    }
  };

  const inputErr = (k) => errors[k] ? "border-destructive" : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter lead name"
              className={inputErr("name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
                className={inputErr("phone")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
                className={inputErr("email")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Source</label>
              <Select value={form.source} onChange={(e) => set("source", e.target.value)} className="w-full">
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Budget (₹)</label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{term.workItemTypeLabel}</label>
            <Input
              value={form.event_type}
              onChange={(e) => set("event_type", e.target.value)}
              placeholder={term.titlePlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tentative {term.workItemSingular} Date</label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Next Follow-up</label>
              <Input
                type="date"
                value={form.next_followup_date}
                onChange={(e) => set("next_followup_date", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes about this lead..."
              rows={3}
              className="w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingLead ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}