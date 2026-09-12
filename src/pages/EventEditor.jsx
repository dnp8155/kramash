import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useToast } from "@/components/ui/use-toast";
import BackConfirmDialog from "@/components/common/BackConfirmDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ChipPicker from "@/components/common/ChipPicker";
import DateRangeChips from "@/components/common/DateRangeChips";
import ClientForm from "@/components/clients/ClientForm";
import QuickClientForm from "@/components/clients/QuickClientForm";
import EventTypeAutocomplete from "@/components/events/EventTypeAutocomplete";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { getEventTypes, buildAllEventTypes, mergeEventTypes, normalizeEventType } from "@/lib/eventTypeService";
import { fyForDate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Plus, Users, Briefcase, Save, Loader2, AlertCircle,
  FolderPlus, FolderOpen, HelpCircle, MapPin, CalendarDays, FileText,
  Wallet, User
} from "lucide-react";

const empty = {
  client_id: "", title: "", event_type: "",
  start_date: "", end_date: "", event_dates: [],
  team_member_ids: [], service_ids: [],
  venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h2 className="font-semibold text-sm text-foreground">{title}</h2>
    </div>
  );
}

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspaceId, workspace } = useWorkspace();
  const term = useBusinessTerminology();
  const t = useT();
  const tTerm = term || {};
  const isEdit = !!id;

  const [usedEventTypes, setUsedEventTypes] = useState([]);

  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const workTypes = buildAllEventTypes(workspace, tTerm.category, usedEventTypes);
  const { showConfirm, confirmBack, stayHere, requestBack, markLeaving } = useBackGuard(isDirty);
  const { toast } = useToast();
  const topRef = useRef(null);

  useEffect(() => {
    if (error && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  useEffect(() => {
    if (workspaceId) {
      loadClients();
      loadTeamAndServices();
      loadUsedEventTypes();
    }
    if (isEdit) {
      loadEvent();
    } else {
      setForm({ ...empty, start_date: todayISO(), end_date: todayISO() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, id]);

  const loadUsedEventTypes = async () => {
    if (!workspaceId) return;
    try {
      const events = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 200);
      const types = (events || []).map((e) => e.event_type).filter(Boolean);
      setUsedEventTypes([...new Set(types)]);
    } catch {
      setUsedEventTypes([]);
    }
  };

  const loadEvent = async () => {
    setLoadingEvent(true);
    try {
      const ev = await base44.entities.Event.get(id);
      const base = { ...empty, ...ev };
      if (!base.event_dates || base.event_dates.length === 0) {
        if (base.start_date) base.event_dates = [base.start_date];
      }
      setForm(base);
      setIsDirty(false);
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

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };
  const setEventDates = (dates) => { setForm((f) => ({ ...f, event_dates: dates })); setIsDirty(true); };

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
    if (v) { setError(v); toast({ title: v, variant: "destructive" }); return; }
    setSaving(true);
    setError("");
    try {
      const dates = (form.event_dates || []).slice().sort();
      const fyLabel = form.start_date ? fyForDate(form.start_date) : "";
      const payload = {
        workspace_id: workspaceId,
        client_id: form.client_id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        event_dates: dates,
        financial_year: form.financial_year || fyLabel || "",
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
      // Auto-add new event type to workspace config for future suggestions
      const eventType = normalizeEventType(form.event_type);
      if (eventType) {
        try {
          const currentTypes = getEventTypes(workspace, tTerm.category);
          const updatedTypes = mergeEventTypes(currentTypes, eventType);
          if (updatedTypes.length !== currentTypes.length) {
            await base44.entities.Workspace.update(workspaceId, {
              event_types: JSON.stringify(updatedTypes)
            });
          }
        } catch { /* non-critical */ }
      }
      if (eventId) {
        try { await syncTeamAssignments(eventId, payload.team_member_ids); } catch { /* non-fatal */ }
      }
      // Optimistic update: inject the saved event into the Events list cache
      // immediately so it appears instantly when the user navigates back —
      // no waiting for a refetch round-trip. We intentionally do NOT invalidate
      // the ["events"] query here: the server has a write-commit delay, so a
      // refetch could return stale data and wipe out this optimistic entry.
      // The realtime sync will refresh the list once the server pushes the
      // create event.
      queryClient.setQueryData(["events", workspaceId], (oldData) => {
        if (!oldData) return oldData;
        const events = oldData.events || [];
        const idx = events.findIndex((e) => e.id === saved.id);
        if (idx >= 0) {
          const updated = [...events];
          updated[idx] = { ...events[idx], ...saved };
          return { ...oldData, events: updated };
        }
        return { ...oldData, events: [saved, ...events] };
      });
      // Invalidate related caches (but NOT the events list — see above).
      invalidateEntities(queryClient, ["EventTeamAssignment", "EventDayAssignment"]);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      // Delayed refresh of dashboard/financial so they pick up the new event
      // after the server has committed the write.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-transactions"] });
      }, 2000);
      markLeaving();
      setIsDirty(false);
      toast({ title: isEdit ? "Project updated" : "Project created" });
      navigate(eventId ? `/events/${eventId}` : "/events");
    } catch (err) {
      const data = err?.data || err;
      let msg;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        const wl = (tTerm.workItemSingular || "event").toLowerCase();
        msg = `You've reached the Free Plan ${wl} limit (${data.current}/${data.limit}). Upgrade to Pro to create more ${wl}s.`;
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        msg = data.error;
      } else {
        msg = err?.message || `Failed to save ${tTerm.workItemSingular?.toLowerCase() || "event"}. Please try again.`;
      }
      setError(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const teamOptions = teamMembers.map((m) => ({ value: m.id, label: m.name }));
  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }));
  const currency = workspace?.currency || "INR";

  if (loadingEvent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-muted/30">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div ref={topRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={requestBack}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center shrink-0 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FolderPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {isEdit ? "Edit Project" : "Add New Project"}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEdit ? "Update project details and assignments." : "Create a new project for a client."}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/help")}>
              <HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">Need Help?</span>
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left column */}
              <div className="p-6 space-y-7 min-w-0">
                {/* Project Details */}
                <div>
                  <SectionHeader icon={FolderOpen} title="Project Details" />
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{tTerm.workItemTitleLabel || "Project Title"} <span className="text-destructive">*</span></Label>
                      <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Riverside Villa Project" autoFocus />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Client <span className="text-destructive">*</span></Label>
                        <button type="button" onClick={() => setShowQuickClient(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                          <Plus className="w-3 h-3" /> New Client
                        </button>
                      </div>
                      {showQuickClient ? (
                        <QuickClientForm
                          workspaceId={workspaceId}
                          onSaved={async (savedClient) => {
                            await loadClients();
                            set("client_id", savedClient.id);
                            setShowQuickClient(false);
                          }}
                          onCancel={() => setShowQuickClient(false)}
                        />
                      ) : clients.length === 0 && !loadingClients ? (
                        <div className="rounded-md border border-dashed border-border p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2">No clients yet. Add a client to create a project.</p>
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowQuickClient(true)}>
                            <Plus className="w-3.5 h-3.5" /> Add Client
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className="w-full pl-9">
                            <option value="">{loadingClients ? "Loading clients…" : "Select a client"}</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Project Type</Label>
                      <EventTypeAutocomplete
                        value={form.event_type}
                        onChange={(v) => set("event_type", v)}
                        suggestions={workTypes}
                        placeholder="Type or select a project type"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Financials & Location */}
                <div>
                  <SectionHeader icon={Wallet} title="Financials & Location" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Contract Value ({CURRENCY_SYMBOLS[currency] || currency})</Label>
                        <Input type="number" min="0" step="0.01" value={form.contract_value ?? ""} onChange={(e) => set("contract_value", e.target.value)} placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Location" className="pl-9" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder="Full location address" rows={2} className="pl-9" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="p-6 space-y-7 min-w-0">
                {/* Schedule */}
                <div>
                  <SectionHeader icon={CalendarDays} title="Schedule" />
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
                    <p className="text-xs text-muted-foreground mt-1">Pick a start and end date to generate the day list.</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {isEdit && (
                  <>
                    {/* Assignments */}
                    <div>
                      <SectionHeader icon={Briefcase} title="Assignments" />
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Services</Label>
                          <ChipPicker options={serviceOptions} value={form.service_ids || []} onChange={(v) => set("service_ids", v)} multiple size="sm" emptyText="No services found. Add services from the Services page." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Team Members</Label>
                          <ChipPicker options={teamOptions} value={form.team_member_ids || []} onChange={(v) => set("team_member_ids", v)} multiple size="sm" emptyText="No team members found. Add team from the Team page." />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />
                  </>
                )}

                {/* Additional Information */}
                <div>
                  <SectionHeader icon={FileText} title="Additional Information" />
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Description</Label>
                        <span className="text-[11px] text-muted-foreground">{(form.description || "").length}/500</span>
                      </div>
                      <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Project description" rows={2} maxLength={500} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Notes</Label>
                        <span className="text-[11px] text-muted-foreground">{(form.notes || "").length}/500</span>
                      </div>
                      <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} maxLength={500} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer inside the card */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
              <Button type="button" variant="outline" onClick={requestBack} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isEdit ? "Save Changes" : "Create Project"}</>}
              </Button>
            </div>
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

      <BackConfirmDialog
        open={showConfirm}
        onStay={stayHere}
        onLeave={confirmBack}
      />
    </>
  );
}