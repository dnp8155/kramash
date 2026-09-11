import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Plus, Trash2, Save, Loader2, CalendarCheck } from "lucide-react";

export default function MilestoneTemplateManager() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const parsed = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {};
      setTemplates(parsed.milestoneTemplates || []);
    } catch {
      setTemplates([]);
    }
  }, [workspace]);

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

  const save = async () => {
    setSaving(true);
    try {
      const existing = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {};
      const updated = { ...existing, milestoneTemplates: templates };
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(updated) });
      setWorkspace((w) => ({ ...w, display_preferences: JSON.stringify(updated) }));
      toast({ title: "Milestone templates saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
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
              <button onClick={() => removeTemplate(tIdx)} className="text-muted-foreground hover:text-destructive p-1.5">
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
                  <button onClick={() => removeMilestone(tIdx, mIdx)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addMilestone(tIdx)}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 mt-2"
            >
              <Plus className="w-3 h-3" /> Add milestone
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={addTemplate}>
          <Plus className="w-3.5 h-3.5" /> Add Template
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save</>}
        </Button>
      </div>
    </div>
  );
}