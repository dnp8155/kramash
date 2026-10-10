import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { loadMilestones, allocateReceivedToMilestones, MILESTONE_STATUS_META, milestoneTotals, recalculateMilestoneDueAmounts, generateMilestonesFromTemplate } from "@/lib/milestoneService";
import { formatMoney } from "@/utils/format";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { useT } from "@/hooks/useT";

const DUE_DATE_TYPES = [
  { value: "custom", label: "Custom Date" },
  { value: "on_signing", label: "On Signing" },
  { value: "event_day", label: "Event Day" },
  { value: "day_after_event", label: "Day After Event" },
];

export default function EventMilestonesTab({ event, workspaceId, currency, transactions, serviceAssignments = [], onRefresh }) {
  const t = useT();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "percent", value: 0, due_condition: "", due_date: "", due_date_type: "custom" });
  const [editForm, setEditForm] = useState(null);

  // Due Date Type is a convenience calculator only — PaymentMilestone has no
  // column for it, so it just computes and fills the real due_date field
  // (which does get saved) from the event's own dates.
  const computeDueDate = (dtype) => {
    if (dtype === "event_day") return event?.start_date || "";
    if (dtype === "day_after_event") {
      if (!event?.end_date) return "";
      const d = new Date(event.end_date + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    if (dtype === "on_signing") return "";
    return null; // custom — leave the current due_date value alone
  };

  const templates = useMemo(() => {
    try {
      const raw = workspace?.display_preferences;
      const prefs = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
      return prefs.milestoneTemplates || [];
    } catch { return []; }
  }, [workspace?.display_preferences]);

  const fullContractValue = useMemo(() => {
    const base = Number(event?.contract_value) || 0;
    const addonTotal = (serviceAssignments || [])
      .filter((a) => a.assignment_status !== "removed" && a.is_addon)
      .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
    const miscItems = parseMiscExpenses(event?.misc_expenses_json);
    const miscTotal = miscExpensesTotal(miscItems);
    return base + addonTotal + miscTotal;
  }, [event?.contract_value, event?.misc_expenses_json, serviceAssignments]);

  const load = useCallback(async () => {
    if (!workspaceId || !event?.id) return;
    setLoading(true);
    try {
      let list = await loadMilestones(workspaceId, { eventId: event.id });

      if (fullContractValue > 0) {
        const needsRecalc = list.some((m) =>
          m.milestone_type === "percent" &&
          Math.round((fullContractValue * (Number(m.milestone_value) || 0)) / 100) !== (Number(m.due_amount) || 0)
        );
        if (needsRecalc) {
          await recalculateMilestoneDueAmounts(workspaceId, event.id, fullContractValue);
          list = await loadMilestones(workspaceId, { eventId: event.id });
        }
      }

      // Money the client has paid is spread across the milestones in order (auto-divided).
      setMilestones(allocateReceivedToMilestones(list, transactions));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceId, event?.id, transactions, fullContractValue]);

  useEffect(() => { load(); }, [load]);

  const calcDueAmount = (type, value) => {
    if (type === "percent") return Math.round((fullContractValue * value) / 100);
    return value;
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) { toast({ title: t("Name is required") }); return; }
    if (addForm.type === "percent") {
      const totalPercent = milestones
        .filter((m) => m.milestone_type === "percent")
        .reduce((s, m) => s + (Number(m.milestone_value) || 0), 0) + (Number(addForm.value) || 0);
      if (totalPercent > 100) {
        toast({ title: t("Total percentage cannot exceed 100%"), variant: "destructive" });
        return;
      }
    }
    try {
      const dueAmount = calcDueAmount(addForm.type, addForm.value);
      await base44.entities.PaymentMilestone.create({
        workspace_id: workspaceId,
        event_id: event.id,
        client_id: event.client_id || null,
        quotation_id: null,
        name: addForm.name.trim(),
        milestone_type: addForm.type,
        milestone_value: Number(addForm.value) || 0,
        due_amount: dueAmount,
        paid_amount: 0,
        due_condition: addForm.due_condition || "",
        due_date: addForm.due_date || null,
        sort_order: milestones.length,
        status: "upcoming"
      });
      toast({ title: t("Milestone added") });
      setShowAdd(false);
      setAddForm({ name: "", type: "percent", value: 0, due_condition: "", due_date: "", due_date_type: "custom" });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: t("Failed to add milestone"), description: e?.message, variant: "destructive" });
    }
  };

  const handleApplyTemplate = async (templateId) => {
    const tpl = templates.find((tp) => tp.id === templateId);
    if (!tpl) return;
    const hasPaid = milestones.some((m) => (Number(m.linked_paid) || 0) > 0);
    if (hasPaid) {
      toast({ title: t("Can't apply template"), description: t("This event already has payments linked to its milestones. Remove those milestones first if you want to start over."), variant: "destructive" });
      return;
    }
    if (milestones.length > 0 && !confirm(`${t("Replace existing milestones with template")} "${tpl.name}"? (${milestones.length})`)) return;
    setApplyingTemplate(true);
    try {
      await Promise.all(milestones.map((m) => base44.entities.PaymentMilestone.delete(m.id)));
      await generateMilestonesFromTemplate(workspaceId, event.id, event.client_id || "", fullContractValue, tpl, event?.start_date, event?.end_date);
      toast({ title: t("Template applied") });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: t("Failed to apply template"), description: e?.message, variant: "destructive" });
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleEdit = async (milestone) => {
    if (!editForm.name.trim()) { toast({ title: t("Name is required") }); return; }
    if (editForm.type === "percent") {
      const totalPercent = milestones
        .filter((m) => m.id !== milestone.id && m.milestone_type === "percent")
        .reduce((s, m) => s + (Number(m.milestone_value) || 0), 0) + (Number(editForm.value) || 0);
      if (totalPercent > 100) {
        toast({ title: t("Total percentage cannot exceed 100%"), variant: "destructive" });
        return;
      }
    }
    try {
      const dueAmount = calcDueAmount(editForm.type, editForm.value);
      await base44.entities.PaymentMilestone.update(milestone.id, {
        name: editForm.name.trim(),
        milestone_type: editForm.type,
        milestone_value: Number(editForm.value) || 0,
        due_amount: dueAmount,
        due_condition: editForm.due_condition || "",
        due_date: editForm.due_date || null
      });
      toast({ title: t("Milestone updated") });
      setEditingId(null);
      setEditForm(null);
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: t("Failed to update milestone"), description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (milestone) => {
    if (!confirm(`${t("Delete milestone")} "${milestone.name}"?`)) return;
    try {
      await base44.entities.PaymentMilestone.delete(milestone.id);
      toast({ title: t("Milestone deleted") });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: t("Failed to delete"), description: e?.message, variant: "destructive" });
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, type: m.milestone_type, value: m.milestone_value, due_condition: m.due_condition || "", due_date: m.due_date || "", due_date_type: "custom" });
  };

  const totals = milestoneTotals(milestones);

  if (loading) {
    return <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">{t("Loading milestones…")}</div>;
  }

  const ApplyTemplateSelect = ({ className }) => (
    templates.length > 0 ? (
      <Select
        value=""
        disabled={applyingTemplate}
        onChange={(e) => { if (e.target.value) handleApplyTemplate(e.target.value); }}
        className={cn("h-8 text-xs py-0 max-w-[200px]", className)}
      >
        <option value="">{t("Apply template…")}</option>
        {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
      </Select>
    ) : null
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">{t("Total Due")}</div>
          <div className="text-lg font-bold tabular-nums">{formatMoney(totals.totalDue, currency)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">{t("Collected")}</div>
          <div className="text-lg font-bold tabular-nums text-success">{formatMoney(totals.totalPaid, currency)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">{t("Remaining")}</div>
          <div className="text-lg font-bold tabular-nums text-warning">{formatMoney(totals.totalRemaining, currency)}</div>
        </div>
      </div>

      {(() => {
        const baseValue = Number(event?.contract_value) || 0;
        const addonTotal = (serviceAssignments || [])
          .filter((a) => a.assignment_status !== "removed" && a.is_addon)
          .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
        const miscItems = parseMiscExpenses(event?.misc_expenses_json);
        const miscTotal = miscExpensesTotal(miscItems);
        const addons = addonTotal + miscTotal;
        return (
          <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
            <span className="font-medium">{t("Contract breakdown:")}</span> {t("Base")} {formatMoney(baseValue, currency)} · {t("Add-ons")} {formatMoney(addons, currency)} · {t("Total")} {formatMoney(fullContractValue, currency)}
            <span className="block mt-0.5">{t("Milestone due amounts are calculated from the full contract value (base + add-ons).")}</span>
          </div>
        );
      })()}

      {milestones.length === 0 && !showAdd ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">{t("No milestones defined for this event yet.")}</p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> {t("Add Milestone")}
            </Button>
            {templates.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{t("or")}</span>
                <ApplyTemplateSelect />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="space-y-0">
            {milestones.map((m) => {
              const meta = MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.upcoming;
              const isEditing = editingId === m.id;
              return (
                <div key={m.id} className="border-b border-border last:border-0 p-3">
                  {isEditing ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Name")}</label>
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm" autoFocus />
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Type")}</label>
                        <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="h-8 text-sm py-0">
                          <option value="percent">{t("Percent")}</option>
                          <option value="fixed">{t("Fixed")}</option>
                        </Select>
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Value")}</label>
                        <Input type="number" value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })} className="h-8 text-sm text-right py-0" />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Due Condition")}</label>
                        <Input value={editForm.due_condition} onChange={(e) => setEditForm({ ...editForm, due_condition: e.target.value })} className="h-8 text-sm" placeholder={t("e.g. On signing")} />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Due Date Type")}</label>
                        <Select
                          value={editForm.due_date_type}
                          onChange={(e) => {
                            const dtype = e.target.value;
                            const computed = computeDueDate(dtype);
                            setEditForm((f) => ({ ...f, due_date_type: dtype, due_date: computed === null ? f.due_date : computed }));
                          }}
                          className="h-8 text-xs py-0"
                        >
                          {DUE_DATE_TYPES.map((d) => <option key={d.value} value={d.value}>{t(d.label)}</option>)}
                        </Select>
                      </div>
                      <div className="w-36">
                        <label className="text-[10px] text-muted-foreground uppercase">{t("Due Date")}</label>
                        <Input type="date" value={editForm.due_date} disabled={editForm.due_date_type !== "custom"} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="h-8 text-sm py-0" />
                      </div>
                      <div className="flex items-center gap-1 pb-1">
                        <button onClick={() => handleEdit(m)} className="w-8 h-8 rounded-full flex items-center justify-center bg-success/10 border border-success/20 text-success hover:bg-success/20 transition-colors shrink-0" aria-label={t("Save")}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0" aria-label={t("Cancel")}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", meta.className)}>{t(meta.label)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {m.milestone_type === "percent" ? `${m.milestone_value}%` : formatMoney(m.milestone_value, currency)}
                          {m.due_condition ? ` · ${m.due_condition}` : ""}
                          {m.due_date ? ` · ${t("Due:")} ${formatDate(m.due_date)}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums">{formatMoney(m.due_amount, currency)}</div>
                        {m.paid_amount > 0 && (
                          <div className="text-xs text-success tabular-nums">{t("Paid:")} {formatMoney(m.paid_amount, currency)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(m)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" aria-label={t("Edit milestone")} title={t("Edit")}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0" aria-label={t("Delete milestone")} title={t("Delete")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> {t("Add Milestone")}
            </Button>
            <ApplyTemplateSelect />
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
          <div className="text-sm font-semibold">{t("New Milestone")}</div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Name")}</label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="h-8 text-sm" placeholder={t("e.g. Advance on Signing")} autoFocus />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Type")}</label>
              <Select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} className="h-8 text-sm py-0">
                <option value="percent">{t("Percent")}</option>
                <option value="fixed">{t("Fixed")}</option>
              </Select>
            </div>
            <div className="w-20">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Value")}</label>
              <Input type="number" value={addForm.value} onChange={(e) => setAddForm({ ...addForm, value: Number(e.target.value) })} className="h-8 text-sm text-right py-0" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Due Condition")}</label>
              <Input value={addForm.due_condition} onChange={(e) => setAddForm({ ...addForm, due_condition: e.target.value })} className="h-8 text-sm" placeholder={t("e.g. On signing")} />
            </div>
            <div className="w-32">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Due Date Type")}</label>
              <Select
                value={addForm.due_date_type}
                onChange={(e) => {
                  const dtype = e.target.value;
                  const computed = computeDueDate(dtype);
                  setAddForm((f) => ({ ...f, due_date_type: dtype, due_date: computed === null ? f.due_date : computed }));
                }}
                className="h-8 text-xs py-0"
              >
                {DUE_DATE_TYPES.map((d) => <option key={d.value} value={d.value}>{t(d.label)}</option>)}
              </Select>
            </div>
            <div className="w-36">
              <label className="text-[10px] text-muted-foreground uppercase">{t("Due Date")}</label>
              <Input type="date" value={addForm.due_date} disabled={addForm.due_date_type !== "custom"} onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })} className="h-8 text-sm py-0" />
            </div>
            <div className="flex items-center gap-1 pb-1">
              <button onClick={handleAdd} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover">
                {t("Add")}
              </button>
              <button onClick={() => { setShowAdd(false); setAddForm({ name: "", type: "percent", value: 0, due_condition: "", due_date: "", due_date_type: "custom" }); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0" aria-label={t("Cancel")}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {fullContractValue > 0 && addForm.type === "percent" && (
            <p className="text-xs text-muted-foreground">{t("Calculated:")} {formatMoney(calcDueAmount(addForm.type, addForm.value), currency)} ({t("from contract value")} {formatMoney(fullContractValue, currency)})</p>
          )}
        </div>
      )}
    </div>
  );
}