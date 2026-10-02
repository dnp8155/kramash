import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Plus, Trash2, Save, Loader2, CalendarCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MilestoneTemplateManager() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = workspace?.display_preferences;
      const parsed = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
      const initial = parsed.milestoneTemplates || [];
      setTemplates(initial);
      setSavedTemplates(initial);
    } catch {
      setTemplates([]);
      setSavedTemplates([]);
    }
  }, [workspace]);

  const dirty = JSON.stringify(templates) !== JSON.stringify(savedTemplates);

  const addTemplate = () => {
    setTemplates([...templates, {
      id: `mt_${Date.now()}`,
      name: "New Template",
      milestones: [
        { name: "Advance", type: "percent", value: 30, due_condition: "On signing" },
        { name: "Balance", type: "percent", value: 70, due_condition: "On event day" }
      ]
    }]);
  };

  const updateTemplate = (idx, field, value) => {
    setTemplates(templates.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const removeTemplate = (idx) => {
    setTemplates(templates.filter((_, i) => i !== idx));
  };

  const setDefault = (idx) => {
    setTemplates(templates.map((t, i) => ({ ...t, is_default: i === idx })));
  };

  const addMilestone = (tIdx) => {
    setTemplates(templates.map((t, i) =>
      i === tIdx ? { ...t, milestones: [...t.milestones, { name: "", type: "percent", value: 0, due_condition: "" }] } : t
    ));
  };

  const updateMilestone = (tIdx, mIdx, field, value) => {
    setTemplates(templates.map((t, i) => {
      if (i !== tIdx) return t;
      return { ...t, milestones: t.milestones.map((m, j) => j === mIdx ? { ...m, [field]: value } : m) };
    }));
  };

  const removeMilestone = (tIdx, mIdx) => {
    setTemplates(templates.map((t, i) => {
      if (i !== tIdx) return t;
      return { ...t, milestones: t.milestones.filter((_, j) => j !== mIdx) };
    }));
  };

  const percentTotal = (tpl) =>
    tpl.milestones.filter((m) => m.type === "percent").reduce((sum, m) => sum + (Number(m.value) || 0), 0);

  const isFullyAllocated = (tpl) =>
    tpl.milestones.some((m) => m.type === "percent") && percentTotal(tpl) >= 100;

  const save = async () => {
    setSaving(true);
    try {
      const raw = workspace?.display_preferences;
      const existing = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
      const updated = { ...existing, milestoneTemplates: templates };
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(updated) });
      setWorkspace((w) => ({ ...w, display_preferences: JSON.stringify(updated) }));
      setSavedTemplates(templates);
      toast({ title: "Milestone templates saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarCheck className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Milestone Templates</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Create reusable payment milestone templates to apply to quotations.</p>

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">No templates yet. Create one to speed up quotation creation.</p>
      )}

      <div className="space-y-3">
        {templates.map((tpl, tIdx) => (
          <div key={tpl.id} className="border border-border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={tpl.name}
                onChange={(e) => updateTemplate(tIdx, "name", e.target.value)}
                className="flex-1 h-8 text-sm font-medium"
                placeholder="Template name"
              />
              <button
                onClick={() => setDefault(tIdx)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border transition-colors shrink-0",
                  tpl.is_default
                    ? "bg-amber-50 border-amber-200 text-amber-500"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-label={tpl.is_default ? "Default template" : "Set as default"}
                title={tpl.is_default ? "Default template (auto-applies to new events)" : "Set as default"}
              >
                <Star className="w-3.5 h-3.5" fill={tpl.is_default ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${tpl.name}" template?`)) return;
                  removeTemplate(tIdx);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                aria-label="Delete template"
                title="Delete template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {tpl.milestones.map((m, mIdx) => (
                <div key={mIdx} className="flex flex-wrap items-center gap-1.5">
                  <Input
                    value={m.name}
                    onChange={(e) => updateMilestone(tIdx, mIdx, "name", e.target.value)}
                    className="flex-1 min-w-[100px] h-7 text-xs"
                    placeholder="Milestone name"
                  />
                  <Select
                    value={m.type}
                    onChange={(e) => updateMilestone(tIdx, mIdx, "type", e.target.value)}
                    className="w-20 h-7 text-xs py-0"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed</option>
                  </Select>
                  <Input
                    type="number"
                    value={m.value}
                    onChange={(e) => updateMilestone(tIdx, mIdx, "value", Number(e.target.value))}
                    className="w-16 h-7 text-xs text-right py-0"
                  />
                  <Input
                    value={m.due_condition}
                    onChange={(e) => updateMilestone(tIdx, mIdx, "due_condition", e.target.value)}
                    className="flex-1 min-w-[100px] h-7 text-xs"
                    placeholder="Due condition"
                  />
                  <button
                    onClick={() => removeMilestone(tIdx, mIdx)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                    aria-label="Delete milestone"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {isFullyAllocated(tpl) ? (
              <p className="text-xs text-muted-foreground mt-2">Milestones already total 100% — adjust or remove one to add another.</p>
            ) : (
              <button
                onClick={() => addMilestone(tIdx)}
                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 mt-2"
              >
                <Plus className="w-3 h-3" /> Add milestone
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={addTemplate}>
          <Plus className="w-3.5 h-3.5" /> Add Template
        </Button>
        <Button size="sm" variant={dirty ? "primary" : "outline"} onClick={save} disabled={saving || !dirty}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save</>}
        </Button>
      </div>
    </div>
  );
}