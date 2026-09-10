import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { getDefaultEventTypes } from "@/lib/eventTypeService";
import { Plus, Trash2, RotateCcw, Loader2 } from "lucide-react";

// EventTypeManager — workspace-level configuration of Event / Work Types.
// Stored as a JSON string array on workspace.event_types.
export default function EventTypeManager({ workspace }) {
  const { toast } = useToast();
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const parsed = workspace?.event_types ? JSON.parse(workspace.event_types) : null;
      if (parsed && Array.isArray(parsed)) {
        setTypes(parsed);
      } else {
        // Fall back to category defaults if nothing configured yet
        setTypes(getDefaultEventTypes(workspace?.business_category));
      }
    } catch {
      setTypes(getDefaultEventTypes(workspace?.business_category));
    }
  }, [workspace]);

  const persist = async (nextTypes) => {
    if (!workspace?.id) return;
    setSaving(true);
    try {
      await base44.entities.Workspace.update(workspace.id, {
        event_types: JSON.stringify(nextTypes)
      });
      setTypes(nextTypes);
      toast({ title: "Event types saved" });
    } catch (e) {
      toast({ title: "Failed to save event types", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (types.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "This type already exists", variant: "destructive" });
      return;
    }
    persist([...types, trimmed]);
    setNewType("");
  };

  const removeType = (type) => {
    persist(types.filter((t) => t !== type));
  };

  const resetToDefaults = () => {
    if (!confirm("Reset event types to the default set for your business category? Custom types will be removed.")) return;
    persist(getDefaultEventTypes(workspace?.business_category));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <div key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-sm text-foreground border border-border">
            <span>{t}</span>
            <button
              onClick={() => removeType(t)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${t}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {types.length === 0 && (
          <p className="text-xs text-muted-foreground">No event types configured. Add one below.</p>
        )}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addType(); } }}
            placeholder="Add a new event type (e.g. Sangeet, Mehndi)"
            className="w-full"
          />
        </div>
        <Button size="sm" variant="dark" onClick={addType} disabled={saving || !newType.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </Button>
      </div>

      <button
        onClick={resetToDefaults}
        disabled={saving}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        Reset to defaults
      </button>
    </div>
  );
}