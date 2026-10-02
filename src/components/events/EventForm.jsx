import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import { isWithinLimit } from "@/lib/wordLimit";
import { Label } from "@/components/ui/label";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import ClientForm from "@/components/clients/ClientForm";
import DateRangeChips from "@/components/common/DateRangeChips";
import { Plus, User } from "lucide-react";
import { fyForDate, todayISO } from "@/lib/dates";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel, fyRecordValue } from "@/lib/financialYearService";
import { getEventTypes, buildAllEventTypes, normalizeEventType, mergeEventTypes } from "@/lib/eventTypeService";
import EventTypeAutocomplete from "@/components/events/EventTypeAutocomplete";
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

  useEffect(() => {
    if (open) {
      setError("");
      const base = event ? { ...empty, ...event } : { ...empty, start_date: todayISO(), end_date: todayISO() };
      if (event && (!base.event_dates || base.event_dates.length === 0) && base.start_date) {
        base.event_dates = [base.start_date];
      }
      setForm(base);
      setOriginalDates(event ? getEventDates(event) : []);
      loadClients();
      loadUsedEventTypes();
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

  const validate = () => {
    const workLabel = tm.workItemSingular || t("Event");
    if (!(form.title || "").trim()) return `${workLabel} ${t("title is required.")}`;
    if (!form.client_id) return t("Please select a client.");
    if (!form.start_date) return t("Pick a start date.");
    if (!form.end_date) return t("Pick an end date.");
    if ((form.event_dates || []).length === 0) return `${t("Select at least one")} ${tm.dayLabel || t("day")} ${t("from the range.")}`;
    if (!isWithinLimit(form.description || "", 140)) return t("Description exceeds the 140-word limit.");
    if (!isWithinLimit(form.notes || "", 140)) return t("Notes exceed the 140-word limit.");
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
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
            <AppDialogDescription>
              {event ? t("Update details.") : t("Create a new booking for a client.")}
            </AppDialogDescription>
          </AppDialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <AppDialogBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{tm.workItemDetailsLabel || t("Project Details")}</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tm.workItemTitleLabel || t("Event Title")} <span className="text-destructive">*</span></Label>
                    <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("Title")} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t("Client")} <span className="text-destructive">*</span></Label>
                      <button type="button" onClick={() => setShowClientForm(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> {t("New Client")}
                      </button>
                    </div>
                    {clients.length === 0 && !loadingClients ? (
                      <div className="rounded-md border border-dashed border-border p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-2">{t("No clients yet. Add a client to get started.")}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)}>
                          <Plus className="w-3.5 h-3.5" /> {t("Add Client")}
                        </Button>
                      </div>
                    ) : (
                      <Select icon={User} value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className="w-full">
                        <option value="">{loadingClients ? t("Loading clients…") : t("Select a client")}</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{tm.workItemTypeLabel || t("Event Type")}</Label>
                    <EventTypeAutocomplete
                      value={form.event_type}
                      onChange={(v) => set("event_type", v)}
                      suggestions={workTypes}
                      placeholder={t("Type or select a type")}
                    />
                  </div>

                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t("Financials & Location")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Contract Value")} ({CURRENCY_SYMBOLS[currency] || currency})</Label>
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
                      <Label className="text-xs">{tm.locationLabel || t("Venue")}</Label>
                      <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={tm.locationLabel || t("Venue")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tm.locationAddressLabel || t("Venue Address")}</Label>
                    <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder={t("Full address")} rows={2} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t("Schedule")}</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Dates")} <span className="text-destructive">*</span></Label>
                    <DateRangeChips
                      startDate={form.start_date}
                      endDate={form.end_date}
                      value={form.event_dates || []}
                      onChange={setEventDates}
                      onStartChange={(v) => set("start_date", v)}
                      onEndChange={(v) => set("end_date", v)}
                      dayLabel={tm.dayLabel}
                    />
                  </div>

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
                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t("Additional Info")}</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Description")}</Label>
                    <WordCounterTextarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("Description")} rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Notes")}</Label>
                    <WordCounterTextarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("Internal notes")} rows={2} />
                  </div>
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
              <Button type="submit" disabled={saving}>
                {saving ? t("Saving…") : event ? t("Save Changes") : tm.addWorkItemLabel || t("Add Event")}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
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