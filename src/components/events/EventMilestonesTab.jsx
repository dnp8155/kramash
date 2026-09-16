import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { loadMilestones, deriveMilestoneStatus, MILESTONE_STATUS_META, milestoneTotals, recalculateMilestoneDueAmounts } from "@/lib/milestoneService";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";

export default function EventMilestonesTab({ event, workspaceId, currency, transactions, serviceAssignments = [], onRefresh }) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "percent", value: 0, due_condition: "", due_date: "" });
  const [editForm, setEditForm] = useState(null);

  // Full contract value = base + service add-ons + misc add-ons (same logic as eventFinancialSummary)
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

      // Recalculate percent milestones' due_amount if the full contract value changed
      // (e.g. service add-ons or custom add-ons were added/removed)
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

      const enriched = list.map((m) => {
        const paid = (transactions || [])
          .filter((t) => t.milestone_id === m.id && t.status === "ACTIVE")
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        return { ...m, paid_amount: paid, status: deriveMilestoneStatus({ ...m, paid_amount: paid }) };
      });
      setMilestones(enriched);
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
    if (!addForm.name.trim()) { toast({ title: "Name is required" }); return; }
    try {
      const dueAmount = calcDueAmount(addForm.type, addForm.value);
      await base44.entities.PaymentMilestone.create({
        workspace_id: workspaceId,
        event_id: event.id,
        client_id: event.client_id || "",
        quotation_id: "",
        name: addForm.name.trim(),
        milestone_type: addForm.type,
        milestone_value: Number(addForm.value) || 0,
        due_amount: dueAmount,
        paid_amount: 0,
        due_condition: addForm.due_condition || "",
        due_date: addForm.due_date || "",
        sort_order: milestones.length,
        status: "upcoming"
      });
      toast({ title: "Milestone added" });
      setShowAdd(false);
      setAddForm({ name: "", type: "percent", value: 0, due_condition: "", due_date: "" });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: "Failed to add milestone", description: e?.message, variant: "destructive" });
    }
  };

  const handleEdit = async (milestone) => {
    if (!editForm.name.trim()) { toast({ title: "Name is required" }); return; }
    try {
      const dueAmount = calcDueAmount(editForm.type, editForm.value);
      await base44.entities.PaymentMilestone.update(milestone.id, {
        name: editForm.name.trim(),
        milestone_type: editForm.type,
        milestone_value: Number(editForm.value) || 0,
        due_amount: dueAmount,
        due_condition: editForm.due_condition || "",
        due_date: editForm.due_date || ""
      });
      toast({ title: "Milestone updated" });
      setEditingId(null);
      setEditForm(null);
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: "Failed to update milestone", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (milestone) => {
    if (!confirm(`Delete milestone "${milestone.name}"?`)) return;
    try {
      await base44.entities.PaymentMilestone.delete(milestone.id);
      toast({ title: "Milestone deleted" });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, type: m.milestone_type, value: m.milestone_value, due_condition: m.due_condition || "", due_date: m.due_date || "" });
  };

  const totals = milestoneTotals(milestones);

  if (loading) {
    return <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">Loading milestones…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Total Due</div>
          <div className="text-lg font-bold tabular-nums">{formatMoney(totals.totalDue, currency)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Collected</div>
          <div className="text-lg font-bold tabular-nums text-success">{formatMoney(totals.totalPaid, currency)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Remaining</div>
          <div className="text-lg font-bold tabular-nums text-warning">{formatMoney(totals.totalRemaining, currency)}</div>
        </div>
      </div>

      {/* Contract value breakdown — milestones use full contract value (base + add-ons) */}
      {(() => {
        const baseValue = Number(event?.contract_value) || 0;
        const addonTotal = (serviceAssignments || [])
          .filter((a) => a.assignment_status !== "removed" && a.is_addon)
          .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
        const miscItems = parseMiscExpenses(event?.misc_expenses_json);
        const miscTotal = miscExpensesTotal(miscItems);
        const addons = addonTotal + miscTotal;
        if (addons <= 0) return null;
        return (
          <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
            <span className="font-medium">Contract breakdown:</span> Base {formatMoney(baseValue, currency)} · Add-ons {formatMoney(addons, currency)} · Total {formatMoney(fullContractValue, currency)}
            <span className="block mt-0.5">Milestone due amounts are calculated from the full contract value (base + add-ons).</span>
          </div>
        );
      })()}

      {/* Milestones list */}
      {milestones.length === 0 && !showAdd ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">No milestones defined for this event yet.</p>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Milestone
          </Button>
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
                        <label className="text-[10px] text-muted-foreground uppercase">Name</label>
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] text-muted-foreground uppercase">Type</label>
                        <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="h-8 text-sm py-0">
                          <option value="percent">Percent</option>
                          <option value="fixed">Fixed</option>
                        </Select>
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] text-muted-foreground uppercase">Value</label>
                        <Input type="number" value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })} className="h-8 text-sm text-right py-0" />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] text-muted-foreground uppercase">Due Condition</label>
                        <Input value={editForm.due_condition} onChange={(e) => setEditForm({ ...editForm, due_condition: e.target.value })} className="h-8 text-sm" placeholder="e.g. On signing" />
                      </div>
                      <div className="w-36">
                        <label className="text-[10px] text-muted-foreground uppercase">Due Date</label>
                        <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="h-8 text-sm py-0" />
                      </div>
                      <div className="flex items-center gap-1 pb-1">
                        <button onClick={() => handleEdit(m)} className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="w-8 h-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:bg-muted">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", meta.className)}>{meta.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {m.milestone_type === "percent" ? `${m.milestone_value}%` : formatMoney(m.milestone_value, currency)}
                          {m.due_condition ? ` · ${m.due_condition}` : ""}
                          {m.due_date ? ` · Due: ${m.due_date}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums">{formatMoney(m.due_amount, currency)}</div>
                        {m.paid_amount > 0 && (
                          <div className="text-xs text-success tabular-nums">Paid: {formatMoney(m.paid_amount, currency)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(m)} className="text-muted-foreground hover:text-foreground p-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="text-muted-foreground hover:text-destructive p-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Milestone
            </Button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
          <div className="text-sm font-semibold">New Milestone</div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted-foreground uppercase">Name</label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Advance on Signing" autoFocus />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-muted-foreground uppercase">Type</label>
              <Select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} className="h-8 text-sm py-0">
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </Select>
            </div>
            <div className="w-20">
              <label className="text-[10px] text-muted-foreground uppercase">Value</label>
              <Input type="number" value={addForm.value} onChange={(e) => setAddForm({ ...addForm, value: Number(e.target.value) })} className="h-8 text-sm text-right py-0" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted-foreground uppercase">Due Condition</label>
              <Input value={addForm.due_condition} onChange={(e) => setAddForm({ ...addForm, due_condition: e.target.value })} className="h-8 text-sm" placeholder="e.g. On signing" />
            </div>
            <div className="w-36">
              <label className="text-[10px] text-muted-foreground uppercase">Due Date</label>
              <Input type="date" value={addForm.due_date} onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })} className="h-8 text-sm py-0" />
            </div>
            <div className="flex items-center gap-1 pb-1">
              <button onClick={handleAdd} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover">
                Add
              </button>
              <button onClick={() => { setShowAdd(false); setAddForm({ name: "", type: "percent", value: 0, due_condition: "", due_date: "" }); }} className="w-8 h-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:bg-muted">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {fullContractValue > 0 && addForm.type === "percent" && (
            <p className="text-xs text-muted-foreground">Calculated: {formatMoney(calcDueAmount(addForm.type, addForm.value), currency)} (from contract value {formatMoney(fullContractValue, currency)})</p>
          )}
        </div>
      )}
    </div>
  );
}