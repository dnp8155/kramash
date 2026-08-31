import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { TASK_TYPES, createTask, updateTask } from "@/lib/productionService";

const EMPTY = {
  title: "",
  description: "",
  task_type: "editing",
  priority: "medium",
  due_date: "",
  assigned_to: ""
};

export default function ProductionTaskForm({ open, onClose, onSaved, task, workspaceId, eventId, teamMembers = [] }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(task ? { ...EMPTY, ...task } : EMPTY);
    }
  }, [open, task]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast({ title: "Task title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        event_id: eventId,
        title: form.title.trim(),
        description: form.description || "",
        task_type: form.task_type || "editing",
        priority: form.priority || "medium",
        due_date: form.due_date || "",
        assigned_to: form.assigned_to || ""
      };
      if (task?.id) {
        await updateTask(task.id, payload);
        toast({ title: "Task updated" });
      } else {
        await createTask(payload);
        toast({ title: "Task created" });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: "Failed to save task", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.id ? "Edit Task" : "New Production Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Task Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Edit wedding highlights" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Task Type</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.task_type}
                onChange={(e) => set("task_type", e.target.value)}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.assigned_to || ""}
                onChange={(e) => set("assigned_to", e.target.value)}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Optional details..." />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : task?.id ? "Update Task" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}