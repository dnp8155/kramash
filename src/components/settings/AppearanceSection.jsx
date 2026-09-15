import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { themes } from "@/constants/preferencesConfig";
import Toggle from "@/components/common/Toggle";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import PastelPalettePicker from "@/components/settings/PastelPalettePicker";
import { cn } from "@/lib/utils";

export default function AppearanceSection() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const prefs = useDisplayPreferences();

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "Contact Sheet";
    return localStorage.getItem("app-theme") || "Contact Sheet";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "Night") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const setPref = (key) => async (v) => {
    const next = { ...prefs, [key]: v };
    try {
      await base44.entities.Workspace.update(workspace.id, {
        display_preferences: JSON.stringify(next),
      });
      setWorkspace((w) => (w ? { ...w, display_preferences: JSON.stringify(next) } : w));
    } catch (e) {
      toast({ title: "Failed to save preference", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "px-3 py-2 rounded-md text-sm border transition-colors",
                theme === t ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {theme === "Pastel" && <PastelPalettePicker />}
      </div>
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold mb-3">Display</h3>
        <div className="space-y-3">
          <ToggleRow label="Show event status" hint="Event status colors (Upcoming, In Progress, Completed, Cancelled)" checked={prefs.showProgressIndicators} onChange={setPref("showProgressIndicators")} />
          <ToggleRow label="Show member type colors" hint="Color-code team member type tags (Bride Side, Groom Side, etc.)" checked={prefs.showMemberTypeColors} onChange={setPref("showMemberTypeColors")} />
          <ToggleRow label="Show status dots" hint="Colored dots before event & team names — turn off to remove all dots" checked={prefs.showStatusDots} onChange={setPref("showStatusDots")} />
          <ToggleRow label="Group upcoming events" hint="Show events grouped by This Week / All, or as a flat list" checked={prefs.groupUpcoming} onChange={setPref("groupUpcoming")} />
          <ToggleRow label="Show menubar labels" hint="Show text labels under icons in the mobile bottom navigation" checked={prefs.showMenubarLabels} onChange={setPref("showMenubarLabels")} />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm text-foreground block">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}