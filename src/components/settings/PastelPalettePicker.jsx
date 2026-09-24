import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { DEFAULT_PASTEL_COLORS } from "@/lib/pastelTheme";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PastelPalettePicker() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const prefs = useDisplayPreferences();

  const palette = DEFAULT_PASTEL_COLORS;
  const activeIdx = prefs.pastelThemeIndex ?? 0;

  const selectActive = async (idx) => {
    const next = { ...prefs, pastelThemeIndex: idx };
    try {
      await base44.entities.Workspace.update(workspace.id, {
        display_preferences: JSON.stringify(next),
      });
      setWorkspace((w) => (w ? { ...w, display_preferences: JSON.stringify(next) } : w));
    } catch (e) {
      toast({ title: "Failed to save color", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Select theme color</p>
        <div className="grid grid-cols-5 gap-2">
          {palette.map((color, idx) => (
            <button
              key={`select-${idx}`}
              type="button"
              onClick={() => selectActive(idx)}
              className={cn(
                "h-11 rounded-lg border-2 transition-all flex items-center justify-center",
                activeIdx === idx ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-primary/40"
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} as theme color`}
            >
              {activeIdx === idx && <Check className="w-4 h-4 text-foreground" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This color applies as your app's accent. Event types are not auto-colored.
        </p>
      </div>
    </div>
  );
}