import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useToast } from "@/components/ui/use-toast";
import BackConfirmDialog from "@/components/common/BackConfirmDialog";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import { EventDetailsFields, EventMoneyLocationFields, EventScheduleFields, EventNotesFields, validateEventForm } from "@/components/events/EventFormFields";
import ClientForm from "@/components/clients/ClientForm";
import QuickClientForm from "@/components/clients/QuickClientForm";
import { getEventTypes, buildAllEventTypes, mergeEventTypes, normalizeEventType } from "@/lib/eventTypeService";
import { fyForDate, todayISO } from "@/lib/dates";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import {
  ArrowLeft, Save, Loader2, AlertCircle, FolderOpen, CalendarDays, FileText,
  Wallet
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspaceId, workspace, setWorkspace: setWorkspaceContext } = useWorkspace();
  const term = useBusinessTerminology();
  const t = useT();
  const tTerm = term || {};
  usePageTitle(`${t("New")} ${term.workItemSingular}`);

  const [usedEventTypes, setUsedEventTypes] = useState([]);
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const workTypes = buildAllEventTypes(workspace, tTerm.category, usedEventTypes);
  const { showConfirm, confirmBack, stayHere, requestBack, markLeaving } = useBackGuard(isDirty);
  const { toast } = useToast();
  const topRef = useRef(null);

  useEffect(() => { if (error && topRef.current) { topRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } }, [error]);

  useEffect(() => {
    if (workspaceId) { loadClients(); loadUsedEventTypes(); }
    setForm({ ...empty, start_date: todayISO(), end_date: todayISO() });
  }, [workspaceId]);

  const loadUsedEventTypes = async () => {
    if (!workspaceId) return;
    try { const events = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 200); const types = (events || []).map((e) => e.event_type).filter(Boolean); setUsedEventTypes([...new Set(types)]); }
    catch { setUsedEventTypes([]); }
  };

  const loadClients = async () => {
    if (!workspaceId) return;
    setLoadingClients(true);
    try { const list = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 200); setClients(list || []); }
    catch { setClients([]); }
    finally { setLoadingClients(false); }
  };

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };
  const setEventDates = (dates) => { setForm((f) => ({ ...f, event_dates: dates })); setIsDirty(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateEventForm(form, tTerm, t);
    if (v) { setError(v); toast({ title: v, variant: "destructive" }); return; }
    await doSave();
  };

  const doSave = async () => {
    if (!start()) return;
    setError("");
    try {
      const dates = (form.event_dates || []).slice().sort();
      const fyLabel = form.start_date ? fyForDate(form.start_date) : "";
      const payload = {
        workspace_id: workspaceId, client_id: form.client_id, title: form.title.trim(), event_type: form.event_type,
        start_date: form.start_date, end_date: form.end_date || form.start_date, event_dates: dates,
        financial_year: form.financial_year || fyLabel || "",
        team_member_ids: [], service_ids: [], // team and services are assigned from the event page
        venue: (form.venue || "").trim(), venue_address: (form.venue_address || "").trim(), status: form.status,
        contract_value: Number(form.contract_value) || 0, description: (form.description || "").trim(), notes: (form.notes || "").trim()
      };
      const saved = await base44.entities.Event.create(payload);
      const eventId = saved?.id;
      const eventType = normalizeEventType(form.event_type);
      if (eventType) {
        try { const currentTypes = getEventTypes(workspace, tTerm.category); const updatedTypes = mergeEventTypes(currentTypes, eventType); if (updatedTypes.length !== currentTypes.length) { const updatedWs = await base44.entities.Workspace.update(workspaceId, { event_types: JSON.stringify(updatedTypes) }); setWorkspaceContext(updatedWs || { ...workspace, event_types: JSON.stringify(updatedTypes) }); } }
        catch { }
      }
      queryClient.setQueryData(["events", workspaceId], (oldData) => {
        if (!oldData) return oldData;
        const events = oldData.events || [];
        const idx = events.findIndex((e) => e.id === saved.id);
        if (idx >= 0) { const updated = [...events]; updated[idx] = { ...events[idx], ...saved }; return { ...oldData, events: updated }; }
        return { ...oldData, events: [saved, ...events] };
      });
      invalidateEntities(queryClient, ["EventTeamAssignment", "EventDayAssignment"]);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setTimeout(() => { queryClient.invalidateQueries({ queryKey: ["dashboard-events"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-transactions"] }); }, 2000);
      markLeaving(); setIsDirty(false);
      toast({ title: `${tTerm.workItemSingular} ${t("created")}` });
      navigate(eventId ? `/events/${eventId}` : "/events", { replace: true });
    } catch (err) {
      const data = err?.data || err;
      let msg;
      if (data?.error === "PLAN_LIMIT_REACHED") { msg = `${t("You've reached the Free Plan limit")} (${data.current}/${data.limit}). ${t("Upgrade to Pro to create more.")}`; }
      else if (data?.error === "This workspace is suspended. Please contact support.") { msg = data.error; }
      else { msg = err?.message || `${t("Failed to save")}. ${t("Please try again.")}`; }
      setError(msg); toast({ title: msg, variant: "destructive" });
    } finally { stop(); }
  };

  const currency = workspace?.currency || "INR";

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={requestBack} disabled={saving}>{t("Cancel")}</Button>
      <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Saving…")}</> : <><Save className="w-4 h-4" /> {tTerm.createWorkItemLabel}</>}</Button>
    </>
  );

  return (
    <>
      <div ref={topRef} className="p-4 sm:p-6 space-y-4 max-w-3xl lg:max-w-[1100px] mx-auto">
        <button type="button" onClick={requestBack} className="hidden lg:inline-flex -ml-2 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></span>
          {`${t("Back to")} ${tTerm.workItemPlural}`}
        </button>

        <PageHeader title={`${t("Add New")} ${tTerm.workItemSingular}`} />

        {error && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>
        )}

        <form onSubmit={handleSubmit} className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-6">
          {/* Phones: one card with dividers. Desktop (lg): the card dissolves into a main column of section cards plus a side column. */}
          <div className="rounded-[15px] border border-border bg-card shadow-card overflow-hidden lg:contents">
            <div className="p-6 space-y-7 lg:contents lg:space-y-0">
              <div className="space-y-7 lg:space-y-6 lg:col-start-1">
              {/* Project Details */}
              <div className="lg:rounded-[15px] lg:border lg:border-border lg:bg-card lg:shadow-card lg:p-6">
                <SectionHeader icon={FolderOpen} title={tTerm.workItemDetailsLabel} />
                <EventDetailsFields
                  form={form} set={set} tm={tTerm} clients={clients} loadingClients={loadingClients}
                  onNewClient={() => setShowQuickClient(true)} workTypes={workTypes} sideBySide autoFocus
                  quickClient={showQuickClient ? <QuickClientForm workspaceId={workspaceId} onSaved={async (savedClient) => { await loadClients(); set("client_id", savedClient.id); setShowQuickClient(false); }} onCancel={() => setShowQuickClient(false)} /> : null}
                />
              </div>

              <div className="border-t border-border lg:hidden" />

              {/* Financials & Location */}
              <div className="lg:rounded-[15px] lg:border lg:border-border lg:bg-card lg:shadow-card lg:p-6">
                <SectionHeader icon={Wallet} title={t("Financials & Location")} />
                <EventMoneyLocationFields form={form} set={set} tm={tTerm} currency={currency} />
              </div>

              <div className="border-t border-border lg:hidden" />

              {/* Schedule */}
              <div className="lg:rounded-[15px] lg:border lg:border-border lg:bg-card lg:shadow-card lg:p-6">
                <SectionHeader icon={CalendarDays} title={t("Schedule")} />
                <EventScheduleFields form={form} set={set} setEventDates={setEventDates} tm={tTerm} isNew />
              </div>

              </div>

              <div className="border-t border-border lg:hidden" />

              <div className="space-y-7 lg:space-y-6 lg:col-start-2 lg:row-start-1">
              {/* Additional Information */}
              <div className="lg:rounded-[15px] lg:border lg:border-border lg:bg-card lg:shadow-card lg:p-6">
                <SectionHeader icon={FileText} title={t("Additional Information")} />
                <EventNotesFields form={form} set={set} />
              </div>

              {/* Desktop: actions live in the side column and stay in view while scrolling. */}
              <div className="hidden lg:block rounded-[15px] border border-border bg-card shadow-card p-4 lg:sticky lg:top-6">
                <div className="grid grid-cols-2 gap-2">{actions}</div>
              </div>
              </div>
            </div>

            <div className="lg:hidden flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">{actions}</div>
          </div>
        </form>
      </div>

      <ClientForm open={showClientForm} onClose={() => setShowClientForm(false)} workspaceId={workspaceId} onSaved={async (savedClient) => { await loadClients(); set("client_id", savedClient.id); }} />
      <BackConfirmDialog open={showConfirm} onStay={stayHere} onLeave={confirmBack} />
    </>
  );
}