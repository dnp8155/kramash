import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import ClientForm from "@/components/clients/ClientForm";
import { Save, Loader2, FolderOpen, Wallet, CalendarDays, FileText } from "lucide-react";
import { fyForDate, todayISO } from "@/lib/dates";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel, fyRecordValue } from "@/lib/financialYearService";
import { getEventTypes, buildAllEventTypes, normalizeEventType, mergeEventTypes } from "@/lib/eventTypeService";
import { EventDetailsFields, EventMoneyLocationFields, EventScheduleFields, EventNotesFields, validateEventForm } from "@/components/events/EventFormFields";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { getDefaultMilestoneTemplate, generateMilestonesFromTemplate } from "@/lib/milestoneService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getEventDates, datesChanged, shiftTeamAssignments } from "@/lib/dateShift";
import DateShiftConfirmDialog from "@/components/events/DateShiftConfirmDialog";
import { useT } from "@/hooks/useT";

const empty = {
  client_id: "", title: "", event_type: "",
  start_date: "", end_date: "", event_dates: [],
  financial_year: "",
  team_member_ids: [], service_ids: [],
  venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

// Same section heading as the full-page editor: icon tile + title.
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
    </div>
  );
}

// The fields the form edits, normalised so "" / null / 5000 / "5000" compare equal.
function formSnapshot(f) {
  const str = (v) => String(v ?? "").trim();
  return JSON.stringify([
    str(f.title), str(f.client_id), str(f.event_type), str(f.venue), str(f.venue_address),
    str(f.contract_value), str(f.start_date), str(f.end_date || f.start_date), str(f.financial_year),
    [...(f.event_dates || [])].sort(), str(f.description), str(f.notes),
  ]);
}

export default function EventForm({ open, onClose, onSaved, event = null, workspaceId, workspace, term, currency = "INR" }) {
  const tm = term || {};
  const t = useT();
  const queryClient = useQueryClient();
  const { setWorkspace: setWorkspaceContext } = useWorkspace();
  const { fiscalYears } = useFinancialYear();
  const { toast } = useToast();
  const [usedEventTypes, setUsedEventTypes] = useState([]);
  const workTypes = buildAllEventTypes(workspace, tm.category, usedEventTypes);
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [originalDates, setOriginalDates] = useState([]);
  const [showDateShiftDialog, setShowDateShiftDialog] = useState(false);
  const [pendingShift, setPendingShift] = useState(null);
  // When editing, Save only lights up once something differs from the saved event.
  const [baseline, setBaseline] = useState(null);
  const hasChanges = !event || (baseline !== null && formSnapshot(form) !== baseline);

  useEffect(() => {
    if (open) {
      setError("");
      const base = event ? { ...empty, ...event } : { ...empty, start_date: todayISO(), end_date: todayISO() };
      if (event && (!base.event_dates || base.event_dates.length === 0) && base.start_date) {
        base.event_dates = [base.start_date];
      }
      setForm(base);
      setBaseline(formSnapshot(base));
      setOriginalDates(event ? getEventDates(event) : []);
      loadClients();
      loadUsedEventTypes();
    }
     
  }, [open, event]);

  const loadClients = async () => {
    if (!workspaceId) return;
    setLoadingClients(true);
    try {
      const list = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 200);
      setClients(list || []);
    } catch {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setEventDates = (dates) => {
    setForm((f) => ({ ...f, event_dates: dates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateEventForm(form, tm, t);
    if (v) { setError(v); return; }

    if (event?.id) {
      const oldDates = originalDates;
      const newDates = (form.event_dates || []).slice().sort();
      if (datesChanged(oldDates, newDates)) {
        try {
          const existing = await base44.entities.EventTeamAssignment.filter({
            workspace_id: workspaceId, event_id: event.id, assignment_status: "assigned",
          });
          if (existing && existing.length > 0) {
            setPendingShift({ oldDates, newDates });
            setShowDateShiftDialog(true);
            return;
          }
        } catch { /* proceed with save */ }
      }
    }

    await doSave(false);
  };

  const handleShiftChoice = async (shouldShift) => {
    setShowDateShiftDialog(false);
    await doSave(shouldShift);
  };

  const doSave = async (shiftDates) => {
    if (!start()) return;
    setError("");
    try {
      const dates = (form.event_dates || []).slice().sort();
      const startDate = form.start_date;
      const endDate = form.end_date || startDate;
      const fy = form.financial_year || fyForDate(startDate) || "";
      const payload = {
        workspace_id: workspaceId,
        client_id: form.client_id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: startDate,
        end_date: endDate,
        event_dates: dates,
        financial_year: fy,
        team_member_ids: event?.team_member_ids || [],
        service_ids: event?.service_ids || [],
        venue: (form.venue || "").trim(),
        venue_address: (form.venue_address || "").trim(),
        contract_value: Number(form.contract_value) || 0,
        description: (form.description || "").trim(),
        notes: (form.notes || "").trim()
      };
      let saved;
      if (event?.id) {
        saved = await base44.entities.Event.update(event.id, payload);
      } else {
        saved = await base44.entities.Event.create(payload);
      }
      if (!event?.id) {
        try {
          const tpl = getDefaultMilestoneTemplate(workspace);
          if (tpl) {
            await generateMilestonesFromTemplate(workspaceId, saved.id, form.client_id, Number(form.contract_value) || 0, tpl, form.start_date, form.end_date);
            invalidateEntity(queryClient, "PaymentMilestone");
          }
        } catch { /* non-critical */ }
      }
      const eventType = normalizeEventType(form.event_type);
      if (eventType) {
        try {
          const currentTypes = getEventTypes(workspace, tm.category);
          const updatedTypes = mergeEventTypes(currentTypes, eventType);
          const sameSet = JSON.stringify([...currentTypes].sort()) === JSON.stringify([...updatedTypes].sort());
          if (!sameSet) {
            const updatedWs = await base44.entities.Workspace.update(workspaceId, {
              event_types: JSON.stringify(updatedTypes)
            });
            setWorkspaceContext(updatedWs || { ...workspace, event_types: JSON.stringify(updatedTypes) });
          }
        } catch { /* non-critical */ }
      }
      if (shiftDates && pendingShift && event?.id) {
        try {
          const count = await shiftTeamAssignments(base44, workspaceId, saved.id, pendingShift.oldDates, pendingShift.newDates);
          if (count > 0) {
            invalidateEntity(queryClient, "EventTeamAssignment");
          }
        } catch { /* non-critical */ }
      }
      setPendingShift(null);

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
      toast({ title: event ? `${tm.workItemSingular || t("Event")} ${t("updated")}` : `${tm.workItemSingular || t("Event")} ${t("created")}` });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.data || err;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        setError(`${t("You've reached the Free Plan limit")} (${data.current}/${data.limit}). ${t("Upgrade to Pro to create more.")}`);
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        setError(data.error);
      } else {
        setError(err?.message || `${t("Failed to save")}. ${t("Please try again.")}`);
      }
    } finally {
      stop();
    }
  };

  return (
    <>
      <AppDialog open={open && !showClientForm} onOpenChange={(o) => !o && onClose?.()}>
        <AppDialogContent maxWidth="max-w-3xl">
          <AppDialogHeader>
            <AppDialogTitle>{event ? tm.editWorkItemLabel || t("Edit Event") : tm.addWorkItemLabel || t("Add Event")}</AppDialogTitle>
          </AppDialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <AppDialogBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-4">
                <div>
                  <SectionHeader icon={FolderOpen} title={tm.workItemDetailsLabel || t("Project Details")} />
                  <EventDetailsFields form={form} set={set} tm={tm} clients={clients} loadingClients={loadingClients} onNewClient={() => setShowClientForm(true)} workTypes={workTypes} />
                </div>

                <div className="border-t border-border pt-6">
                  <SectionHeader icon={Wallet} title={t("Financials & Location")} />
                  <EventMoneyLocationFields form={form} set={set} tm={tm} currency={currency} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <SectionHeader icon={CalendarDays} title={t("Schedule")} />
                  <EventScheduleFields form={form} set={set} setEventDates={setEventDates} tm={tm} isNew={!event}>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Financial Year")}</Label>
                      <Select
                        value={form.financial_year || fyForDate(form.start_date) || ""}
                        onChange={(e) => set("financial_year", e.target.value)}
                        className="w-full"
                      >
                        <option value="">{t("Auto (from date)")}</option>
                        {fiscalYears.map((fy) => (
                          <option key={fy.id} value={fyRecordValue(fy)}>{fyDisplayLabel(fy)}</option>
                        ))}
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {t("For future-year bookings. Defaults to the FY of the start date.")}
                      </p>
                    </div>
                  </EventScheduleFields>
                </div>

                <div className="border-t border-border pt-6">
                  <SectionHeader icon={FileText} title={t("Additional Information")} />
                  <EventNotesFields form={form} set={set} />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-md bg-destructive/8 text-destructive text-sm border border-destructive/15">
                {error}
              </div>
            )}
            </AppDialogBody>
            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
              <Button type="submit" variant={hasChanges ? "primary" : "outline"} disabled={saving || !hasChanges}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Saving…")}</> : <><Save className="w-4 h-4" /> {event ? t("Save Changes") : tm.addWorkItemLabel || t("Add Event")}</>}
              </Button>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </AppDialog>

      <ClientForm
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        workspaceId={workspaceId}
        onSaved={async (savedClient) => {
          await loadClients();
          set("client_id", savedClient.id);
        }}
      />

      <DateShiftConfirmDialog
        open={showDateShiftDialog}
        onClose={() => { setShowDateShiftDialog(false); setPendingShift(null); }}
        onConfirm={handleShiftChoice}
        oldDates={pendingShift?.oldDates || []}
        newDates={pendingShift?.newDates || []}
        workItemLabel={tm.workItemSingular?.toLowerCase() || "event"}
      />
    </>
  );
}