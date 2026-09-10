import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Section } from "@/components/quotation/QuotationParts";
import { formatMoney } from "@/utils/format";
import { calculateMilestones, validateMilestones, round2 } from "@/lib/quotationCalc";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

export default function QuotationMilestonesEditor({
  schedule, setSchedule, grandTotal, currency, readOnly
}) {
  const milestones = calculateMilestones(schedule, grandTotal);
  const validationError = validateMilestones(schedule, grandTotal);

  const addMilestone = () => {
    setSchedule([...schedule, { name: "", type: "percent", value: 0, due_condition: "" }]);
  };

  const updateMilestone = (idx, field, value) => {
    setSchedule(schedule.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const removeMilestone = (idx) => {
    setSchedule(schedule.filter((_, i) => i !== idx));
  };

  const totalScheduled = milestones.reduce((s, m) => s + (m.calculated_amount || 0), 0);

  return (
    <Section title="Payment Milestones">
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones configured. Add payment stages like "50% Advance", "30% on Event Date", etc.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2 bg-muted/20 border border-border/60 rounded-lg p-2.5">
              <div className="flex flex-col gap-0.5 flex-1 min-w-[140px]">
                <span className="text-[10px] text-muted-foreground uppercase">Name</span>
                <Input value={m.name} onChange={(e) => updateMilestone(idx, "name", e.target.value)} disabled={readOnly} placeholder="e.g. Advance on Signing" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-0.5 w-28">
                <span className="text-[10px] text-muted-foreground uppercase">Type</span>
                <Select value={m.type} onChange={(e) => updateMilestone(idx, "type", e.target.value)} disabled={readOnly} className="h-8 text-xs py-0">
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5 w-24">
                <span className="text-[10px] text-muted-foreground uppercase">{m.type === "percent" ? "% Value" : "Amount"}</span>
                <Input type="number" min="0" value={m.value} onChange={(e) => updateMilestone(idx, "value", Number(e.target.value))} disabled={readOnly} className="h-8 text-xs text-right py-0" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                <span className="text-[10px] text-muted-foreground uppercase">Due Condition</span>
                <Input value={m.due_condition || ""} onChange={(e) => updateMilestone(idx, "due_condition", e.target.value)} disabled={readOnly} placeholder="e.g. On signing" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-0.5 w-24">
                <span className="text-[10px] text-muted-foreground uppercase">Calculated</span>
                <span className="text-sm font-medium tabular-nums h-8 flex items-center">{formatMoney(m.calculated_amount || 0, currency)}</span>
              </div>
              {!readOnly && (
                <button onClick={() => removeMilestone(idx)} className="text-muted-foreground hover:text-destructive p-1.5 mb-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {validationError && (
        <p className="text-xs text-warning flex items-center gap-1 mt-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {validationError}
        </p>
      )}

      {milestones.length > 0 && (
        <div className="flex justify-between text-sm pt-2 border-t border-border">
          <span className="text-muted-foreground">Total Scheduled</span>
          <span className="font-semibold tabular-nums">{formatMoney(round2(totalScheduled), currency)}</span>
        </div>
      )}

      {!readOnly && (
        <Button size="sm" variant="outline" onClick={addMilestone} className="mt-2">
          <Plus className="w-3.5 h-3.5" /> Add Milestone
        </Button>
      )}
    </Section>
  );
}