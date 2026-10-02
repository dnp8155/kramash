import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import {
  DEFAULT_MEMBER_TYPES,
  MAX_MEMBER_TYPES,
  TYPE_COLOR_SWATCHES,
  getMemberTypes,
} from "@/lib/memberTypeService";

export default function TeamMemberTypeManager({ workspace }) {
  const { toast } = useToast();
  const { setWorkspace } = useWorkspace();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: "", color: TYPE_COLOR_SWATCHES[0].hex });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setTypes(getMemberTypes(workspace));
    setLoading(false);
  }, [workspace]);

  const persist = async (newTypes) => {
    if (!workspace?.id) return;
    setSaving(true);
    try {
      await base44.entities.Workspace.update(workspace.id, {
        team_member_types: JSON.stringify(newTypes),
      });
      setTypes(newTypes);
      // Update workspace context so other pages see the change immediately (live color updates)
      setWorkspace((w) => (w ? { ...w, team_member_types: JSON.stringify(newTypes) } : w));
      setEditing(null);
      setDraft({ title: "", color: TYPE_COLOR_SWATCHES[0].hex });
      toast({ title: "Team member type saved" });
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => {
    if (types.length >= MAX_MEMBER_TYPES) {
      toast({ title: `Maximum ${MAX_MEMBER_TYPES} types allowed`, variant: "destructive" });
      return;
    }
    setEditing("new");
    setDraft({ title: "", color: TYPE_COLOR_SWATCHES[0].hex });
  };
  const startEdit = (t) => {
    setEditing(t.id);
    setDraft({ title: t.title, color: t.color });
  };
  const cancel = () => {
    setEditing(null);
    setDraft({ title: "", color: TYPE_COLOR_SWATCHES[0].hex });
  };
  const submit = () => {
    if (!draft.title.trim()) return;
    if (editing === "new") {
      if (types.length >= MAX_MEMBER_TYPES) return;
      persist([...types, { id: `mt${Date.now()}`, ...draft }]);
    } else {
      persist(types.map((t) => (t.id === editing ? { ...t, ...draft } : t)));
    }
  };
  const remove = (t) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    persist(types.filter((x) => x.id !== t.id));
  };

  if (loading) return <p className="text-sm text-muted-foreground py-2">Loading…</p>;

  const atMax = types.length >= MAX_MEMBER_TYPES;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {types.map((t) =>
          editing === t.id ? (
            <TypeEditor
              key={t.id}
              draft={draft}
              setDraft={setDraft}
              onSubmit={submit}
              onCancel={cancel}
              saving={saving}
            />
          ) : (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-sm"
              style={{ backgroundColor: t.color + "20", color: t.color }}
            >
              {t.title}
              <button onClick={() => startEdit(t)} className="w-5 h-5 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit">
                <Pencil className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => remove(t)} className="w-5 h-5 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </span>
          )
        )}
        {editing === "new" && (
          <TypeEditor draft={draft} setDraft={setDraft} onSubmit={submit} onCancel={cancel} saving={saving} />
        )}
      </div>
      {editing !== "new" && (
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={startAdd} disabled={atMax}>
            <Plus className="w-3.5 h-3.5" /> Add Type
          </Button>
          {atMax && (
            <span className="text-xs text-muted-foreground">
              Maximum {MAX_MEMBER_TYPES} types reached. Delete one to add another.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TypeEditor({ draft, setDraft, onSubmit, onCancel, saving }) {
  return (
    <div className="inline-flex flex-col gap-2 px-3 py-2 rounded-md border border-border bg-card">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Type name"
          className="text-sm bg-transparent border border-border rounded px-2 py-1 outline-none w-28 focus:ring-2 focus:ring-ring/40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
        <button onClick={onSubmit} disabled={saving || !draft.title.trim()} className="text-success hover:opacity-70" aria-label="Save">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Color swatches — predefined palette with labels and selection border */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_COLOR_SWATCHES.map((sw) => (
          <button
            key={sw.hex}
            onClick={() => setDraft({ ...draft, color: sw.hex })}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              draft.color === sw.hex
                ? "border-foreground ring-2 ring-ring/30 scale-110"
                : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: sw.hex }}
            aria-label={sw.label}
            title={sw.label}
          />
        ))}
      </div>
    </div>
  );
}