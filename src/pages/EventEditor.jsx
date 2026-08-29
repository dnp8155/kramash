import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ChipPicker from "@/components/common/ChipPicker";
import DateRangeChips from "@/components/common/DateRangeChips";
import ClientForm from "@/components/clients/ClientForm";
import PageHeader from "@/components/common/PageHeader";
import { EVENT_STATUS, EVENT_STATUS_ORDER } from "@/constants/statusConfig";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { ArrowLeft, Plus, Users, Briefcase, Save, Loader2, AlertCircle } from "lucide-react";

const PHOTO_EVENT_TYPES = ["Wedding", "Pre-Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Birthday", "Corporate", "Portfolio", "Other"];
const GENERIC_WORK_TYPES = ["Project", "Assignment", "Consultation", "Site Visit", "Contract", "Other"];

const empty = {
  client_id: "", title: "", event_type: "",
  start_date: "", end_date: "", event_dates: [],
  team_member_ids: [], service_ids: [],
  venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const term = useBusinessTerminology();
  const t = useT();
  const tTerm = term || {};
  const isEdit = !!id;

  const workTypes = tTerm.category === "ARCHITECTURE" || tTerm.category === "OTHER" ? GENERIC_WORK_TYPES : PHOTO_EVENT_TYPES;

  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadClients();
      loadTeamAndServices();
    }
    if (isEdit) {
      loadEvent();
    } else {
      setForm(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, id]);

  const loadEvent = async () => {
    setLoadingEvent(true);
    try {
      const ev = await base44.entities.Event.get(id);
      const base = { ...empty, ...ev };
      if (!base.event_dates || base.event_dates.length === 0) {
        if (base.start_date) base.event_dates = [base.start_date];
      }
      setForm(base);
    } catch (e) {
      setError("Failed to load event.");
    } finally {
      setLoadingEvent(false);
    }
  };

  const loadClients = async () => {
    if (!workspaceId) return;
    setLoadingClients(true);
    try {
      const list = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 200);
      setClients(list || []);
    } catch { setClients([]); }
    finally { setLoadingClients(false); }
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
    } catch { setTeamMembers([]); setServices([]); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setEventDates = (dates) => setForm((f) => ({ ...f, event_dates: dates }));

  const syncTeamAssignments = async (eventId, teamMemberIds) => {
    const existing = await base44.entities.EventTeamAssignment.filter({
      workspace_id: workspaceId, event_id: eventId, assignment_status: "assigned"
    });
    const existingByMember = {};
    (existing || []).forEach((a) => { existingByMember[a.team_member_id] = a; });
    const ids = teamMemberIds || [];
    const toCreate = ids.filter((mid) => !existingByMember[mid]);
    const toRemove = (existing || []).filter((a) => !ids.includes(a.team_member_id));
    if (toCreate.length > 0) {
      await base44.entities.EventTeamAssignment.bulkCreate(
        toCreate.map((mid) => {
          const m = teamMembers.find((x) => x.id === mid);
          return {
            workspace_id: workspaceId, event_id: eventId, team_member_id: mid,
            role_id: m?.role_id || "", role_name_snapshot: m?.profession || "",
            agreed_rate: m?.default_rate || 0, rate_type: m?.rate_type || "Per Event",
            assignment_status: "assigned", notes: ""
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

  const validate = () => {
    const workLabel = tTerm.workItemSingular || "Event";
    if (!form.title.trim()) return `${workLabel} title is required.`;
    if (!form.client_id) return "Please select a client.";
    if (!form.start_date) return "Pick a start date.";
    if (!form.end_date) return "Pick an end date.";
    if ((form.event_dates || []).length === 0) return "Select at least one shoot day from the range.";
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
      const payload = {
        workspace_id: workspaceId,
        client_id: form.client_id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
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
      if (isEdit) {
        saved = await base44.entities.Event.update(id, payload);
      } else {
        const res = await base44.functions.invoke("createEvent", payload);
        saved = res.data || res;
      }
      const eventId = saved?.id || id;
      if (eventId) {
        try { await syncTeamAssignments(eventId, payload.team_member_ids); } catch { /* non-fatal */ }
      }
      navigate(eventId ? `/events/${eventId}` : "/events");
    } catch (err) {
      const data = err?.response?.data || err;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        const wl = (tTerm.workItemSingular || "event").toLowerCase();
        setError(`You've reached the Free Plan ${wl} limit (${data.current}/${data.limit}). Upgrade to Pro to create more ${wl}s.`);
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        setError(data.error);
      } else {
        setError(err?.message || `Failed to save ${tTerm.workItemSingular?.toLowerCase() || "event"}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const workTypeOptions = workTypes.map((wt) => ({ value: wt, label: wt }));
  const statusOptions = EVENT_STATUS_ORDER.map((s) => ({ value: s, label: EVENT_STATUS[s].label }));
  const teamOptions = teamMembers.map((m) => ({ value: m.id, label: m.name }));
  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }));
  const currency = workspace?.currency || "INR";

  if (loadingEvent) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <PageHeader
          title={isEdit ? (tTerm.editWorkItemLabel || "Edit Event") : (tTerm.addWorkItemLabel || "Add Event")}
          subtitle={isEdit ? `Update ${tTerm.workItemSingular?.toLowerCase() || "event"} details.` : `Create a new ${tTerm.workItemSingular?.toLowerCase() || "event"} for a client.`}
        >
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </PageHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
          {/* Left column — core details */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Project Details</p>

              <div className="space-y-1.5">
                <Label className="text-xs">{tTerm.workItemTitleLabel || "Event Title"} <span className="text-destructive">*</span></Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={tTerm.category === "ARCHITECTURE" || tTerm.category === "OTHER" ? "e.g. Riverside Villa Project" : "e.g. Meera & Dev"} autoFocus />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Client <span className="text-destructive">*</span></Label>
                  <button type="button" onClick={() => setShowClientForm(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> New Client
                  </button>
                </div>
                {clients.length === 0 && !loadingClients ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center">
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
                <Label className="text-xs">{tTerm.workItemTypeLabel || "Event Type"}</Label>
                <ChipPicker options={workTypeOptions} value={form.event_type} onChange={(v) => set("event_type", v)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <ChipPicker options={statusOptions} value={form.status} onChange={(v) => set("status", v)} size="sm" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Financials & Location</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contract Value ({CURRENCY_SYMBOLS[currency] || currency})</Label>
                  <Input type="number" min="0" step="0.01" value={form.contract_value ?? ""} onChange={(e) => set("contract_value", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{tTerm.locationLabel || "Venue"}</Label>
                  <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={tTerm.locationLabel || "Venue"} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{tTerm.locationAddressLabel || "Venue Address"}</Label>
                <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder={`Full ${(tTerm.locationLabel || "venue").toLowerCase()} address`} rows={2} />
              </div>
            </div>
          </div>

          {/* Right column — schedule & team */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Schedule</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Dates <span className="text-destructive">*</span></Label>
                <DateRangeChips
                  startDate={form.start_date}
                  endDate={form.end_date}
                  value={form.event_dates || []}
                  onChange={setEventDates}
                  onStartChange={(v) => set("start_date", v)}
                  onEndChange={(v) => set("end_date", v)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Assignments</p>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><Briefcase className="w-3.5 h-3.5" /> Services</Label>
                <ChipPicker options={serviceOptions} value={form.service_ids || []} onChange={(v) => set("service_ids", v)} multiple size="sm" emptyText="No services found. Add services from the Services page." />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Team Members</Label>
                <ChipPicker options={teamOptions} value={form.team_member_ids || []} onChange={(v) => set("team_member_ids", v)} multiple size="sm" emptyText="No team members found. Add team from the Team page." />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Additional Info</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={`${tTerm.workItemSingular || "Event"} description`} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
              </div>
            </div>
          </div>

          {/* Sticky action bar */}
          <div className="lg:col-span-2 flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isEdit ? "Save Changes" : tTerm.addWorkItemLabel || "Add Event"}</>}
            </Button>
          </div>
        </form>
      </div>

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