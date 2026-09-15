// PastelPalettePicker — shown in the Appearance section only when the "Pastel" theme is
// active. Lets the user customize 3–5 pastel colors (pre-set per business category) that
// auto-assign to event/work types by name. Saves to workspace.display_preferences.
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { getDefaultPalette, MIN_PALETTE, MAX_PALETTE } from "@/lib/pastelTheme";
import { RotateCcw, Plus, X } from "lucide-react";

export default function PastelPalettePicker() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const prefs = useDisplayPreferences();
  const category = workspace?.business_category || "OTHER";
  const defaults = getDefaultPalette(category);

  const [palette, setPalette] = useState(() =>
    prefs.pastelPalette && prefs.pastelPalette.length > 0 ? prefs.pastelPalette : defaults
  );
  const [saving, setSaving] = useState(false);

  // Sync local state if workspace prefs change externally
  useEffect(() => {
    setPalette(
      prefs.pastelPalette && prefs.pastelPalette.length > 0 ? prefs.pastelPalette : defaults
    );
  }, [prefs.pastelPalette, category]);

  const persist = async (next) => {
    setSaving(true);
    try {
      const newPrefs = { ...prefs, pastelPalette: next };
      await base44.entities.Workspace.update(workspace.id, {
        display_preferences: JSON.stringify(newPrefs),
      });
      setWorkspace((w) => (w ? { ...w, display_preferences: JSON.stringify(newPrefs) } : w));
    } catch (e) {
      toast({ title: "Failed to save palette", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateColor = (idx, hex) => {
    const next = [...palette];
    next[idx] = hex;
    setPalette(next);
  };

  const commit = () => persist(palette);

  const removeColor = (idx) => {
    if (palette.length <= MIN_PALETTE) return;
    const next = palette.filter((_, i) => i !== idx);
    setPalette(next);
    persist(next);
  };

  const addColor = () => {
    if (palette.length >= MAX_PALETTE) return;
    const next = [...palette, defaults[palette.length] || "#C8C8E8"];
    setPalette(next);
    persist(next);
  };

  const reset = () => {
    setPalette([...defaults]);
    persist([...defaults]);
  };

  return (
    <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Pastel Palette</h4>
          <p className="text-xs text-muted-foreground">
            Colors auto-assign to your event/work types by name.
          </p>
        </div>
        <button
          onClick={reset}
          disabled={saving}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {palette.map((color, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <div className="relative group">
              <label
                className="block w-12 h-12 rounded-lg border-2 border-border group-hover:border-primary/40 transition-colors shadow-sm cursor-pointer"
                style={{ backgroundColor: color }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateColor(idx, e.target.value)}
                  onBlur={commit}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
              {palette.length > MIN_PALETTE && (
                <button
                  type="button"
                  onClick={() => removeColor(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center shadow-sm transition-colors"
                  aria-label="Remove color"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{color}</span>
          </div>
        ))}

        {palette.length < MAX_PALETTE && (
          <button
            type="button"
            onClick={addColor}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
            aria-label="Add color"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}