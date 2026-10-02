import { useState, useEffect } from "react";
import { useT } from "@/hooks/useT";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { Loader2 } from "lucide-react";
import DateRangeChips from "@/components/common/DateRangeChips";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRelated, upsertOptimistic } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { isValidIndianMobile, sanitizePhoneInput, sanitizeEmailInput } from "@/lib/validation";

const SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" }
];

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" }
];

const PRIORITIES = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" }
];

const empty = {
  name: "",
  phone: "",
  email: "",
  source: "other",
  event_type: "",
  event_date: "",
  event_end_date: "",
  event_dates: [],
  budget: "",
  status: "new",
  priority: "warm",
  next_followup_date: "",
  notes: ""
};

export default function LeadForm({ open, onClose, editingLead, onSaved }) {
  const { workspaceId, workspace } = useWorkspace();
  const term = getBusinessTerminology(workspace);
  const currencySymbol = CURRENCY_SYMBOLS[workspace?.currency || "INR"] || "₹";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const [form, setForm] = useState(empty);
  const { saving, start, stop } = useSubmitGuard();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editingLead) {
        const evDates = editingLead.event_dates || (editingLead.event_date ? [editingLead.event_date] : []);
        let evDate = editingLead.event_date || "";
        let evEndDate = editingLead.event_end_date || "";
        if (evDates.length > 0) {
          const sorted = [...evDates].sort();
          if (!evDate) evDate = sorted[0];
          if (!evEndDate) evEndDate = sorted[sorted.length - 1];
        }
        setForm({
          ...empty,
          ...editingLead,
          budget: editingLead.budget || "",
          event_date: evDate,
          event_end_date: evEndDate,
          event_dates: evDates,
          next_followup_date: editingLead.next_followup_date || ""
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, editingLead]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: false }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = true;
    if (form.phone && !isValidIndianMobile(form.phone)) e.phone = true;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!start()) return;
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        phone: form.phone?.trim() || "",
        email: form.email?.trim() || "",
        source: form.source,
        event_type: form.event_type?.trim() || "",
        event_date: form.event_date || "",
        event_end_date: form.event_end_date || "",
        event_dates: form.event_dates || [],
        budget: Number(form.budget) || 0,
        status: form.status,
        priority: form.priority,
        next_followup_date: form.next_followup_date || "",
        notes: form.notes?.trim() || ""
      };

      let saved;
      if (editingLead) {
        saved = await base44.entities.Lead.update(editingLead.id, payload);
        toast({ title: t("Lead updated successfully") });
      } else {
        saved = await base44.entities.Lead.create(payload);
        toast({ title: t("Lead created successfully") });
      }
      upsertOptimistic(queryClient, ["leads", workspaceId], saved,
        (d) => d, (d, list) => list);
      invalidateRelated(queryClient, "Lead");
      onSaved?.();
      onClose();
    } catch (err) {
      const errData = err?.data || err;
      if (errData?.error === "PLAN_LIMIT_REACHED") {
        toast({ title: t("Lead limit reached"), description: `${t("Free plan allows up to")} ${errData.limit} ${t("leads. Upgrade to Pro for unlimited leads.")}`, variant: "destructive" });
      } else {
        toast({ title: t("Failed to save lead"), variant: "destructive" });
      }
    } finally {
      stop();
    }
  };

  const inputErr = (k) => errors[k] ? "border-destructive" : "";

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{editingLead ? t("Edit Lead") : t("Add New Lead")}</AppDialogTitle>
        </AppDialogHeader>

        <AppDialogBody className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Name")} <span className="text-destructive">*</span></label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("Enter lead name")}
              className={inputErr("name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Phone")}</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))}
                placeholder={t("Mobile number")}
                inputMode="tel"
               
                className={inputErr("phone")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Email")}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", sanitizeEmailInput(e.target.value))} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder={t("Email address")}
                className={inputErr("email")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Source")}</label>
              <Select value={form.source} onChange={(e) => set("source", e.target.value)} className="w-full">
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Priority")}</label>
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{t(p.label)}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Status")}</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Budget")} ({currencySymbol})</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{term.workItemTypeLabel}</label>
            <Input
              value={form.event_type}
              onChange={(e) => set("event_type", e.target.value)}
              placeholder={term.titlePlaceholder}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Tentative")} {term.workItemSingular} {t("Dates")}</label>
            <DateRangeChips
              startDate={form.event_date}
              endDate={form.event_end_date}
              value={form.event_dates || []}
              onChange={(dates) => set("event_dates", dates)}
              onStartChange={(v) => set("event_date", v)}
              onEndChange={(v) => set("event_end_date", v)}
              dayLabel={term.dayLabel}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Next Follow-up")}</label>
            <Input
              type="date"
              value={form.next_followup_date}
              onChange={(e) => set("next_followup_date", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Notes")}</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("Additional notes about this lead...")}
              rows={3}
              className="w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            />
          </div>

        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editingLead ? t("Update Lead") : t("Create Lead")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}