import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_TYPES = [
  { id: "mt1", title: "Bride Side", color: "#ec4899" },
  { id: "mt2", title: "Groom Side", color: "#3b82f6" },
  { id: "mt3", title: "Common", color: "#6b7280" },
];

const COLOR_PRESETS = ["#ec4899", "#3b82f6", "#6b7280", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function TeamMemberTypeManager({ workspace }) {
  const { toast } = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: "", color: COLOR_PRESETS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    try {
      const parsed = workspace.team_member_types ? JSON.parse(workspace.team_member_types) : null;
      setTypes(parsed && Array.isArray(parsed) ? parsed : DEFAULT_TYPES);
    } catch {
      setTypes(DEFAULT_TYPES);
    }
    setLoading(false);
  }, [workspace]);

  const persist = async (newTypes) => {
    setSaving(true);
    try {
      await base44.entities.Workspace.update(workspace.id, {
        team_member_types: JSON.stringify(newTypes),
      });
      setTypes(newTypes);
      setEditing(null);
      setDraft({ title: "", color: COLOR_PRESETS[0] });
      toast({ title: "Team member type saved" });
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => {
    setEditing("new");
    setDraft({ title: "", color: COLOR_PRESETS[0] });
  };
  const startEdit = (t) => {
    setEditing(t.id);
    setDraft({ title: t.title, color: t.color });
  };
  const cancel = () => {
    setEditing(null);
    setDraft({ title: "", color: COLOR_PRESETS[0] });
  };
  const submit = () => {
    if (!draft.title.trim()) return;
    if (editing === "new") {
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
              style={{ backgroundColor: t.color + "20", color: t.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.title}
              <button onClick={() => startEdit(t)} className="hover:opacity-70" aria-label="Edit">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => remove(t)} className="hover:opacity-70" aria-label="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          )
        )}
        {editing === "new" && (
          <TypeEditor draft={draft} setDraft={setDraft} onSubmit={submit} onCancel={cancel} saving={saving} />
        )}
      </div>
      {editing !== "new" && (
        <Button variant="outline" size="sm" className="mt-3" onClick={startAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Type
        </Button>
      )}
    </div>
  );
}

function TypeEditor({ draft, setDraft, onSubmit, onCancel, saving }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Type name"
        className="text-sm bg-transparent border-none outline-none w-24"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex gap-1">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => setDraft({ ...draft, color: c })}
            className={`w-4 h-4 rounded-full border-2 ${
              draft.color === c ? "border-foreground" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <button onClick={onSubmit} disabled={saving || !draft.title.trim()} className="text-success hover:opacity-70" aria-label="Save">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}