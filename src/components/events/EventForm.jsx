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
import DateRangeChips from "@/components/common/DateRangeChips";
import { Plus } from "lucide-react";
import { fyForDate } from "@/lib/dates";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel, fyRecordValue } from "@/lib/financialYearService";
import { getEventTypes } from "@/lib/eventTypeService";

const empty = {
  client_id: "", title: "", event_type: "",
  start_date: "", end_date: "", event_dates: [],
  financial_year: "",
  team_member_ids: [], service_ids: [],
  venue: "", venue_address: "",
  status: "upcoming", contract_value: 0, description: "", notes: ""
};

export default function EventForm({ open, onClose, onSaved, event = null, workspaceId, workspace, term, currency = "INR" }) {
  const t = term || {};
  const { fiscalYears } = useFinancialYear();
  const workTypes = getEventTypes(workspace, t.category);
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
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

  // event_dates = selected shoot days within the start/end range.
  const setEventDates = (dates) => {
    setForm((f) => ({ ...f, event_dates: dates }));
  };

  const validate = () => {
    const workLabel = t.workItemSingular || "Event";
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

  return (
    <>
      <Dialog open={open && !showClientForm} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">{event ? t.editWorkItemLabel || "Edit Event" : t.addWorkItemLabel || "Add Event"}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {event ? `Update ${t.workItemSingular?.toLowerCase() || "event"} details.` : `Create a new ${t.workItemSingular?.toLowerCase() || "event"} for a client.`}
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Left column — core details */}
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Project Details</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.workItemTitleLabel || "Event Title"} <span className="text-destructive">*</span></Label>
                    <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t.category === "ARCHITECTURE" || t.category === "OTHER" ? "e.g. Riverside Villa Project" : "e.g. Meera & Dev"} autoFocus />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Client <span className="text-destructive">*</span></Label>
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
                    <Label className="text-xs">{t.workItemTypeLabel || "Event Type"}</Label>
                    <ChipPicker
                      options={workTypeOptions}
                      value={form.event_type}
                      onChange={(v) => set("event_type", v)}
                      size="sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <ChipPicker
                      options={statusOptions}
                      value={form.status}
                      onChange={(v) => set("status", v)}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Financials & Location</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contract Value ({CURRENCY_SYMBOLS[currency] || currency})</Label>
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
                      <Label className="text-xs">{t.locationLabel || "Venue"}</Label>
                      <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={t.locationLabel || "Venue"} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.locationAddressLabel || "Venue Address"}</Label>
                    <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder={`Full ${(t.locationLabel || "venue").toLowerCase()} address`} rows={2} />
                  </div>
                </div>
              </div>

              {/* Right column — schedule & team */}
              <div className="space-y-4">
                <div className="space-y-2.5">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs">Financial Year</Label>
                    <Select
                      value={form.financial_year || fyForDate(form.start_date) || ""}
                      onChange={(e) => set("financial_year", e.target.value)}
                      className="w-full"
                    >
                      <option value="">Auto (from date)</option>
                      {fiscalYears.map((fy) => (
                        <option key={fy.id} value={fyRecordValue(fy)}>{fyDisplayLabel(fy)}</option>
                      ))}
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      For future-year bookings. Defaults to the FY of the start date.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Additional Info</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={`${t.workItemSingular || "Event"} description`} rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mb-3 p-2.5 rounded-md bg-destructive/8 text-destructive text-sm border border-destructive/15">
                {error}
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 flex-row-reverse gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : event ? "Save Changes" : t.addWorkItemLabel || "Add Event"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
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