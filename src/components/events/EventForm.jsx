import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import ClientForm from "@/components/clients/ClientForm";
import { eventStatuses, eventTypes } from "@/constants/events";
import { toast } from "@/components/ui/use-toast";

const empty = {
  title: "",
  client_id: "",
  event_type: "Wedding",
  start_date: "",
  end_date: "",
  venue: "",
  venue_address: "",
  status: "Pending",
  description: "",
  notes: "",
};

export default function EventForm({
  open,
  onClose,
  event,
  clients,
  onSave,
  onCreateClient,
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        event
          ? {
              ...empty,
              ...event,
              start_date: event.start_date || "",
              end_date: event.end_date || "",
            }
          : empty
      );
    }
  }, [open, event?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Event title is required", variant: "destructive" });
      return;
    }
    if (!form.client_id) {
      toast({ title: "Please select a client", variant: "destructive" });
      return;
    }
    if (!form.start_date) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }
    if (form.end_date && form.end_date < form.start_date) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        client_id: form.client_id,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        venue: form.venue.trim(),
        venue_address: form.venue_address.trim(),
        status: form.status,
        description: form.description.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateClient = async (data) => {
    const c = await onCreateClient(data);
    set("client_id", c.id);
    return c;
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={event ? "Edit Event" : "New Event"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {event ? "Save Changes" : "Create Event"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Event Title"
            name="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Sharma Wedding"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Client
            </label>
            <div className="flex gap-2">
              <Select
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
                className="flex-1"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setClientModalOpen(true)}
              >
                <UserPlus className="h-4 w-4" /> New
              </Button>
            </div>
          </div>
          <Select
            label="Type"
            value={form.event_type}
            onChange={(e) => set("event_type", e.target.value)}
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {eventStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Start Date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
          />
          <Input
            label="End Date"
            name="end_date"
            type="date"
            value={form.end_date}
            min={form.start_date || undefined}
            onChange={(e) => set("end_date", e.target.value)}
          />
          <Input
            label="Venue"
            name="venue"
            value={form.venue}
            onChange={(e) => set("venue", e.target.value)}
            placeholder="Venue name"
            className="sm:col-span-2"
          />
          <Input
            label="Venue Address"
            name="venue_address"
            value={form.venue_address}
            onChange={(e) => set("venue_address", e.target.value)}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Brief about the event…"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Internal notes…"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      </Modal>

      <ClientForm
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSave={handleCreateClient}
      />
    </>
  );
}