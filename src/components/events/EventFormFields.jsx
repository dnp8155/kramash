import { Plus, User, MapPin } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import DateRangeChips from "@/components/common/DateRangeChips";
import EventTypeAutocomplete from "@/components/events/EventTypeAutocomplete";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { isWithinLimit } from "@/lib/wordLimit";
import { useT } from "@/hooks/useT";

// The event form's fields, shared by the full-page "Add New" editor and the edit dialog so the two can't drift
// apart. Each export is one section's fields; the caller supplies the heading and the surrounding card/layout.

// Returns an error message, or "" when the form is fine.
export function validateEventForm(form, tm, t) {
  const workLabel = tm.workItemSingular || t("Event");
  if (!(form.title || "").trim()) return `${workLabel} ${t("title is required.")}`;
  if (!form.client_id) return t("Please select a client.");
  if (!form.start_date) return t("Pick a start date.");
  if (!form.end_date) return t("Pick an end date.");
  if ((form.event_dates || []).length === 0) return `${t("Select at least one")} ${tm.dayLabel || t("day")} ${t("from the range.")}`;
  if (!isWithinLimit(form.description || "", 140)) return t("Description exceeds the 140-word limit.");
  if (!isWithinLimit(form.notes || "", 140)) return t("Notes exceed the 140-word limit.");
  return "";
}

// Title, client and type. `quickClient` (a node) replaces the client picker while an inline "new client" form is open.
export function EventDetailsFields({ form, set, tm, clients, loadingClients, onNewClient, workTypes, quickClient = null, sideBySide = false, autoFocus = false }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{tm.workItemTitleLabel || t("Event Title")} <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("Title")} autoFocus={autoFocus} />
      </div>
      <div className={sideBySide ? "space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-end" : "space-y-4"}>
        <div className={`space-y-1.5 ${quickClient && sideBySide ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("Client")} <span className="text-destructive">*</span></Label>
            <button type="button" onClick={onNewClient} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> {t("New Client")}
            </button>
          </div>
          {quickClient ? quickClient : clients.length === 0 && !loadingClients ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">{t("No clients yet. Add a client to get started.")}</p>
              <Button type="button" variant="outline" size="sm" onClick={onNewClient}><Plus className="w-3.5 h-3.5" /> {t("Add Client")}</Button>
            </div>
          ) : (
            <Select icon={User} value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className="w-full">
              <option value="">{loadingClients ? t("Loading clients…") : t("Select a client")}</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{tm.workItemTypeLabel || t("Event Type")}</Label>
          <EventTypeAutocomplete value={form.event_type} onChange={(v) => set("event_type", v)} suggestions={workTypes} placeholder={t("Type or select a type")} />
        </div>
      </div>
    </div>
  );
}

// Contract value, location and address.
export function EventMoneyLocationFields({ form, set, tm, currency }) {
  const t = useT();
  const place = tm.locationLabel || t("Venue");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Contract Value")} ({CURRENCY_SYMBOLS[currency] || currency})</Label>
          <Input type="number" min="0" step="0.01" value={form.contract_value ?? ""} onChange={(e) => set("contract_value", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{place}</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={place} className="pl-9" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{tm.locationAddressLabel || t("Venue Address")}</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder={t("Full address")} rows={2} className="pl-9" />
        </div>
      </div>
    </div>
  );
}

// Date range + the day list. `children` renders extra fields below (the dialog adds a financial-year picker).
export function EventScheduleFields({ form, set, setEventDates, tm, isNew = false, children }) {
  const t = useT();
  return (
    <div className="space-y-4">
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
          followStart={isNew}
        />
        <p className="text-xs text-muted-foreground mt-1">{t("Pick a start and end date to generate the day list.")}</p>
      </div>
      {children}
    </div>
  );
}

// Description and internal notes.
export function EventNotesFields({ form, set }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("Description")}</Label>
        <WordCounterTextarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("Description")} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t("Notes")}</Label>
        <WordCounterTextarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("Internal notes")} rows={2} />
      </div>
    </div>
  );
}
