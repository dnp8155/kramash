import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EVENT_STATUS, EVENT_STATUS_ORDER } from "@/constants/statusConfig";
import ClientForm from "@/components/clients/ClientForm";
import { Plus } from "lucide-react";

const EVENT_TYPES = ["Wedding", "Pre-Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Birthday", "Corporate", "Portfolio", "Other"];

const empty = {
  client_id: "", title: "", event_type: "Wedding",
  start_date: "", end_date: "", venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

export default function EventForm({ open, onClose, onSaved, event = null, workspaceId }) {
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setForm(event ? { ...empty, ...event } : empty);
      loadClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const loadClients = async () => {
    if (!workspaceId) return;
    setLoadingClients(true);
    try {
      const list = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 200);
      setClients(list || []);
    } catch (e) {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.title.trim()) return "Event title is required.";
    if (!form.client_id) return "Please select a client.";
    if (!form.start_date) return "Start date is required.";
    if (form.end_date && form.end_date < form.start_date) return "End date cannot be before start date.";
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
        client_id: form.client_id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        venue: form.venue.trim(),
        venue_address: form.venue_address.trim(),
        status: form.status,
        contract_value: Number(form.contract_value) || 0,
        description: form.description.trim(),
        notes: form.notes.trim()
      };
      let saved;
      if (event?.id) {
        saved = await base44.entities.Event.update(event.id, payload);
      } else {
        saved = await base44.entities.Event.create(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showClientForm} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{event ? "Edit Event" : "Add Event"}</DialogTitle>
            <DialogDescription>
              {event ? "Update event details." : "Create a new event for a client."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Event Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Meera & Dev" autoFocus />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Client <span className="text-destructive">*</span></Label>
                <button type="button" onClick={() => setShowClientForm(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New Client
                </button>
              </div>
              <Select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className="w-full">
                <option value="">{loadingClients ? "Loading clients…" : "Select a client"}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Select value={form.event_type} onChange={(e) => set("event_type", e.target.value)} className="w-full">
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full">
                  {EVENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{EVENT_STATUS[s].label}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Contract Value (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.contract_value ?? ""}
                onChange={(e) => set("contract_value", e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Venue name" />
            </div>

            <div className="space-y-1.5">
              <Label>Venue Address</Label>
              <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder="Full venue address" rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Event description" rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : event ? "Save Changes" : "Add Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ClientForm
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        workspaceId={workspaceId}
        onSaved={async (savedClient) => {
          await loadClients();
          set("client_id", savedClient.id);
        }}
      />
    </>
  );
}