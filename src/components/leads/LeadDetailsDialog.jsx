import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { STATUS_STYLES, PRIORITY_STYLES, LOST_REASONS } from "@/constants/leadConfig";
import { leadDates, isOpenLead } from "@/lib/leadManager";
import { logLeadActivity, markLeadContacted } from "@/lib/leadService";
import { formatDate, formatDatesList, formatRelativeTime, toISODate, todayISO, parseISODate } from "@/lib/dates";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Phone, Mail, Calendar, CalendarClock, MessageCircle, StickyNote, ArrowRightLeft, Pencil, Loader2, Plus, UserPlus, User, History, Check } from "lucide-react";

const KIND_ICON = { note: StickyNote, call: Phone, whatsapp: MessageCircle, status: ArrowRightLeft, followup: CalendarClock };

const addDaysISO = (n) => {
  const d = parseISODate(todayISO());
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

// One lead in detail: quick actions, the next follow-up, and its history (notes, calls, messages, status changes).
export default function LeadDetailsDialog({ open, lead, onClose, onEdit, onMessage }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: activities, isLoading, isError } = useQuery({
    queryKey: ["lead-activities", lead?.id],
    queryFn: () => base44.entities.LeadActivity.filter({ lead_id: lead.id }, "-created_date", 100),
    enabled: open && !!lead?.id,
    staleTime: 15 * 1000,
  });

  if (!lead) return null;
  const st = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
  const pr = PRIORITY_STYLES[lead.priority] || PRIORITY_STYLES.warm;
  const dates = leadDates(lead);

  const refresh = () => {
    invalidateEntities(queryClient, ["Lead"]);
    queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
  };

  const addNote = async () => {
    const body = note.trim();
    if (!body) return;
    setBusy(true);
    await logLeadActivity(workspaceId, lead.id, { kind: "note", body });
    setNote("");
    setBusy(false);
    refresh();
  };

  const setFollowUp = async (iso) => {
    setBusy(true);
    try {
      await base44.entities.Lead.update(lead.id, { next_followup_date: iso || "" });
      await logLeadActivity(workspaceId, lead.id, { kind: "followup", body: iso ? `${t("Follow-up set for")} ${formatDate(iso)}` : t("Follow-up cleared") });
      refresh();
    } catch {
      toast({ title: t("Failed to save lead"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const call = async () => {
    window.location.href = `tel:${String(lead.phone).replace(/[^\d+]/g, "")}`;
    try { await markLeadContacted(workspaceId, lead, "call"); refresh(); } catch { /* call still goes ahead */ }
  };

  const describe = (a) => {
    if (a.kind === "call") return t("Called");
    if (a.kind === "whatsapp") return `${t("WhatsApp message")}${a.body ? ` · ${t(a.body)}` : ""}`;
    if (a.kind === "status") {
      const from = STATUS_STYLES[a.from_status]?.label, to = STATUS_STYLES[a.to_status]?.label;
      const [, reasonKey] = String(a.body || "").match(/reason:(\w+)/) || [];
      const reason = reasonKey && LOST_REASONS.find((r) => r.value === reasonKey)?.label;
      const extra = String(a.body || "").replace(/reason:\w+\s*·?\s*/, "").trim();
      return `${from ? `${t(from)} → ` : ""}${t(to || a.to_status)}${reason ? ` · ${t(reason)}` : ""}${extra ? ` · ${extra}` : ""}`;
    }
    return a.body || "";
  };

  const open_ = isOpenLead(lead);

  const sectionLabel = "flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide";
  const chip = (selected) => cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all disabled:opacity-50",
    selected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
  );

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{lead.name}</AppDialogTitle>
          <AppDialogDescription>
            {[t(st.label), t(pr.label), lead.event_type].filter(Boolean).join(" · ")}
          </AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className={sectionLabel}><User className="w-3.5 h-3.5" /> {t("Contact")}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
              {lead.email && <span className="flex items-center gap-1 min-w-0"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.email}</span></span>}
              {dates.length > 0 && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDatesList(dates)}</span>}
              {!lead.phone && !lead.email && dates.length === 0 && <span>{t("No contact details saved.")}</span>}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {lead.phone && <Button size="sm" variant="outline" onClick={call}><Phone className="w-3.5 h-3.5" /> {t("Call")}</Button>}
              <Button size="sm" variant="outline" onClick={() => onMessage(lead)}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
            </div>
          </div>

          {lead.notes && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className={sectionLabel}><StickyNote className="w-3.5 h-3.5" /> {t("Message / Notes")}</div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-anywhere">{lead.notes}</p>
            </div>
          )}

          {open_ && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
              <div className={sectionLabel}><CalendarClock className="w-3.5 h-3.5" /> {t("Next follow-up")}</div>
              <div className="text-sm font-medium text-foreground">
                {lead.next_followup_date ? formatDate(lead.next_followup_date) : <span className="text-muted-foreground font-normal">{t("Not set")}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[[t("Tomorrow"), 1], [t("In 3 days"), 3], [t("Next week"), 7]].map(([label, n]) => {
                  const iso = addDaysISO(n);
                  const selected = lead.next_followup_date === iso;
                  return (
                    <button key={n} type="button" disabled={busy} onClick={() => setFollowUp(iso)} aria-pressed={selected} className={chip(selected)}>
                      {selected && <Check className="w-3 h-3" />}{label}
                    </button>
                  );
                })}
                <input type="date" value={lead.next_followup_date || ""} min={todayISO()} disabled={busy} onChange={(e) => setFollowUp(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" aria-label={t("Pick a date")} />
                {lead.next_followup_date && (
                  <button type="button" disabled={busy} onClick={() => setFollowUp("")} className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2">{t("Clear")}</button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className={sectionLabel}><History className="w-3.5 h-3.5" /> {t("History")}</div>
            <div className="flex items-center gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} placeholder={t("Add a note…")} className="flex-1 min-w-0" />
              <Button size="sm" onClick={addNote} disabled={busy || !note.trim()} className="shrink-0">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} {t("Add")}
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-lg bg-muted/50 skeleton-shimmer" />)}</div>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-3">
                {(activities || []).map((a) => {
                  const Icon = KIND_ICON[a.kind] || StickyNote;
                  return (
                    <li key={a.id} className="pl-5 relative">
                      <span className={cn("absolute -left-[11px] top-0 w-[22px] h-[22px] rounded-full bg-card border border-border flex items-center justify-center", a.kind === "note" ? "text-foreground" : "text-primary")}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <div className="text-sm text-foreground whitespace-pre-wrap break-anywhere">{describe(a)}</div>
                      <div className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at || a.created_date)}</div>
                    </li>
                  );
                })}
                <li className="pl-5 relative">
                  <span className="absolute -left-[11px] top-0 w-[22px] h-[22px] rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground"><UserPlus className="w-3 h-3" /></span>
                  <div className="text-sm text-muted-foreground">{t("Lead added")}</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeTime(lead.created_at || lead.created_date)}</div>
                </li>
              </ol>
            )}
            {isError && <p className="text-xs text-muted-foreground">{t("History isn't available yet.")}</p>}
          </div>
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={() => onEdit(lead)}><Pencil className="w-4 h-4" /> {t("Edit")}</Button>
          <Button onClick={onClose}>{t("Close")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
