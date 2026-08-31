import { Phone, Mail, MessageCircle, Users, StickyNote, CalendarClock, GitBranch, Plus } from "lucide-react";
import { useState } from "react";
import { ACTIVITY_TYPES, addActivity } from "@/lib/leadService";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  follow_up: CalendarClock,
  stage_change: GitBranch
};

export default function LeadActivityTimeline({ activities, workspaceId, leadId, onAdded }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [activityType, setActivityType] = useState("note");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = [...(activities || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const handleAdd = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await addActivity(workspaceId, leadId, activityType, description.trim());
      setDescription("");
      setShowAdd(false);
      toast({ title: "Activity logged" });
      onAdded?.();
    } catch (e) {
      toast({ title: "Failed to log activity", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Activity Timeline</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="w-3 h-3" /> Log Activity
        </Button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_TYPES.map((t) => {
              const Icon = ICON_MAP[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => setActivityType(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    activityType === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"
                  )}
                >
                  <Icon className="w-3 h-3" /> {t.label}
                </button>
              );
            })}
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What happened?" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !description.trim()}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet.</p>
        )}
        {sorted.map((act) => {
          const Icon = ICON_MAP[act.activity_type] || StickyNote;
          return (
            <div key={act.id} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 pb-3 border-b border-border last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground capitalize">{act.activity_type.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(act.created_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{act.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}