import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { getDefaultEventTypes, normalizeEventType } from "@/lib/eventTypeService";
import { Plus, Trash2, RotateCcw, Loader2 } from "lucide-react";

// EventTypeManager — workspace-level configuration of Event / Work Types.
// Stored as a JSON string array on workspace.event_types.
export default function EventTypeManager({ workspace }) {
  const { toast } = useToast();
  const { setWorkspace } = useWorkspace();
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState("");
  const [saving, setSaving] = useState(false);
  const backfilledRef = useRef(false);

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

  // Custom types already used on events (typed in the event form, imported, or added before
  // this list existed) must be listed here too — backfill any that are missing.
  const { data: usedTypes } = useQuery({
    queryKey: ["event-types-in-use", workspace?.id],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ workspace_id: workspace.id }, "-created_date", 500);
      return [...new Set((events || []).map((e) => normalizeEventType(e.event_type)).filter(Boolean))];
    },
    enabled: !!workspace?.id,
    staleTime: 60000
  });

  useEffect(() => {
    if (backfilledRef.current || !usedTypes || !workspace?.id) return;
    const known = new Set(types.map((t) => normalizeEventType(t).toLowerCase()));
    const missing = usedTypes.filter((t) => !known.has(t.toLowerCase()));
    if (types.length === 0 || missing.length === 0) return;
    backfilledRef.current = true;
    persist([...types, ...missing]);
   
  }, [usedTypes, types]);

  const persist = async (nextTypes) => {
    if (!workspace?.id) return;
    setSaving(true);
    try {
      await base44.entities.Workspace.update(workspace.id, {
        event_types: JSON.stringify(nextTypes)
      });
      setTypes(nextTypes);
      setWorkspace((w) => (w ? { ...w, event_types: JSON.stringify(nextTypes) } : w));
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
          <div key={t} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-muted text-sm text-foreground border border-border">
            <span>{t}</span>
            <button
              onClick={() => removeType(t)}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${t}`}
            >
              <Trash2 className="w-2.5 h-2.5" />
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
            placeholder="Add a new event type"
            className="w-full"
          />
        </div>
        <Button size="sm" variant="primary" onClick={addType} disabled={saving || !newType.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </Button>
      </div>

      <button
        onClick={resetToDefaults}
        disabled={saving}
        className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1.5 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        Reset to defaults
      </button>
    </div>
  );
}