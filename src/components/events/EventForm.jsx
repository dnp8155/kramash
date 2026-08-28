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
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import ClientForm from "@/components/clients/ClientForm";
import ChipPicker from "@/components/common/ChipPicker";
import DateChipsInput from "@/components/common/DateChipsInput";
import { Plus, Users, Briefcase } from "lucide-react";

const PHOTO_EVENT_TYPES = ["Wedding", "Pre-Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Birthday", "Corporate", "Portfolio", "Other"];
const GENERIC_WORK_TYPES = ["Project", "Assignment", "Consultation", "Site Visit", "Contract", "Other"];

const empty = {
  client_id: "", title: "", event_type: "",
  start_date: "", end_date: "", event_dates: [],
  team_member_ids: [], service_ids: [],
  venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

export default function EventForm({ open, onClose, onSaved, event = null, workspaceId, term, currency = "INR" }) {
  const t = term || {};
  const workTypes = t.category === "ARCHITECTURE" || t.category === "OTHER" ? GENERIC_WORK_TYPES : PHOTO_EVENT_TYPES;
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      const base = event ? { ...empty, ...event } : empty;
      // Backfill event_dates from legacy start_date when editing old events.
      if (event && (!base.event_dates || base.event_dates.length === 0) && base.start_date) {
        base.event_dates = [base.start_date];
      }
      setForm(base);
      loadClients();
      loadTeamAndServices();
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

  const loadTeamAndServices = async () => {
    if (!workspaceId) return;
    try {
      const [team, svcs] = await Promise.all([
        base44.entities.TeamMember.filter({ workspace_id: workspaceId, status: "active" }, "name", 200),
        base44.entities.Service.filter({ workspace_id: workspaceId, status: "active" }, "name", 200)
      ]);
      setTeamMembers(team || []);
      setServices(svcs || []);
    } catch (e) {
      setTeamMembers([]);
      setServices([]);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Sync team_member_ids on the event to EventTeamAssignment records so the
  // EventDetails Team tab (which reads assignments) stays in sync with the form.
  const syncTeamAssignments = async (eventId, teamMemberIds) => {
    const existing = await base44.entities.EventTeamAssignment.filter({
      workspace_id: workspaceId,
      event_id: eventId,
      assignment_status: "assigned"
    });
    const existingByMember = {};
    (existing || []).forEach((a) => { existingByMember[a.team_member_id] = a; });
    const ids = teamMemberIds || [];
    const toCreate = ids.filter((id) => !existingByMember[id]);
    const toRemove = (existing || []).filter((a) => !ids.includes(a.team_member_id));
    if (toCreate.length > 0) {
      await base44.entities.EventTeamAssignment.bulkCreate(
        toCreate.map((id) => {
          const m = teamMembers.find((x) => x.id === id);
          return {
            workspace_id: workspaceId,
            event_id: eventId,
            team_member_id: id,
            role_id: m?.role_id || "",
            role_name_snapshot: m?.profession || "",
            agreed_rate: m?.default_rate || 0,
            rate_type: m?.rate_type || "Per Event",
            assignment_status: "assigned",
            notes: ""
          };
        })
      );
    }
    if (toRemove.length > 0) {
      await base44.entities.EventTeamAssignment.bulkUpdate(
        toRemove.map((a) => ({ id: a.id, assignment_status: "removed" }))
      );
    }
  };

  // When event_dates change, keep start_date / end_date in sync (earliest / latest).
  const setEventDates = (dates) => {
    setForm((f) => {
      const sorted = [...dates].sort();
      const next = { ...f, event_dates: sorted };
      if (sorted.length > 0) {
        next.start_date = sorted[0];
        next.end_date = sorted[sorted.length - 1];
      }
      return next;
    });
  };

  const validate = () => {
    const workLabel = t.workItemSingular || "Event";
    if (!form.title.trim()) return `${workLabel} title is required.`;
    if (!form.client_id) return "Please select a client.";
    if (!form.start_date && (form.event_dates || []).length === 0) return "Add at least one date.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      const dates = (form.event_dates || []).slice().sort();
      const startDate = dates[0] || form.start_date;
      const endDate = dates[dates.length - 1] || form.end_date || startDate;
      const payload = {
        workspace_id: workspaceId,
        client_id: form.client_id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: startDate,
        end_date: endDate,
        event_dates: dates,
        team_member_ids: form.team_member_ids || [],
        service_ids: form.service_ids || [],
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
        const res = await base44.functions.invoke("createEvent", payload);
        saved = res.data || res;
      }
      const eventId = saved?.id || event?.id;
      if (eventId) {
        try { await syncTeamAssignments(eventId, payload.team_member_ids); } catch (e) { /* non-fatal */ }
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.response?.data || err;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        const wl = (t.workItemSingular || "event").toLowerCase();
        setError(`You've reached the Free Plan ${wl} limit (${data.current}/${data.limit}). Upgrade to Pro to create more ${wl}s.`);
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        setError(data.error);
      } else {
        setError(err?.message || `Failed to save ${t.workItemSingular?.toLowerCase() || "event"}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const workTypeOptions = workTypes.map((wt) => ({ value: wt, label: wt }));
  const statusOptions = EVENT_STATUS_ORDER.map((s) => ({ value: s, label: EVENT_STATUS[s].label }));
  const teamOptions = teamMembers.map((m) => ({ value: m.id, label: m.name }));
  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }));

  return (
    <>
      <Dialog open={open && !showClientForm} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{event ? t.editWorkItemLabel || "Edit Event" : t.addWorkItemLabel || "Add Event"}</DialogTitle>
            <DialogDescription>
              {event ? `Update ${t.workItemSingular?.toLowerCase() || "event"} details.` : `Create a new ${t.workItemSingular?.toLowerCase() || "event"} for a client.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.workItemTitleLabel || "Event Title"} <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t.category === "ARCHITECTURE" || t.category === "OTHER" ? "e.g. Riverside Villa Project" : "e.g. Meera & Dev"} autoFocus />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Client <span className="text-destructive">*</span></Label>
                <button type="button" onClick={() => setShowClientForm(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New Client
                </button>
              </div>
              {clients.length === 0 && !loadingClients ? (
                <div className="rounded-md border border-dashed border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No clients yet. Add a client to create an event.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Client
                  </Button>
                </div>
              ) : (
                <Select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className="w-full">
                  <option value="">{loadingClients ? "Loading clients…" : "Select a client"}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t.workItemTypeLabel || "Event Type"}</Label>
              <ChipPicker
                options={workTypeOptions}
                value={form.event_type}
                onChange={(v) => set("event_type", v)}
                size="sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <ChipPicker
                options={statusOptions}
                value={form.status}
                onChange={(v) => set("status", v)}
                size="sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dates <span className="text-destructive">*</span></Label>
              <DateChipsInput value={form.event_dates || []} onChange={setEventDates} />
            </div>

            <div className="space-y-1.5">
              <Label>Contract Value ({CURRENCY_SYMBOLS[currency] || currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.contract_value ?? ""}
                onChange={(e) => set("contract_value", e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Services</Label>
              <ChipPicker
                options={serviceOptions}
                value={form.service_ids || []}
                onChange={(v) => set("service_ids", v)}
                multiple
                size="sm"
                emptyText="No services found. Add services from the Services page."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team Members</Label>
              <ChipPicker
                options={teamOptions}
                value={form.team_member_ids || []}
                onChange={(v) => set("team_member_ids", v)}
                multiple
                size="sm"
                emptyText="No team members found. Add team from the Team page."
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.locationLabel || "Venue"}</Label>
              <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={t.locationLabel || "Venue"} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.locationAddressLabel || "Venue Address"}</Label>
              <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder={`Full ${(t.locationLabel || "venue").toLowerCase()} address`} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={`${t.workItemSingular || "Event"} description`} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : event ? "Save Changes" : t.addWorkItemLabel || "Add Event"}
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