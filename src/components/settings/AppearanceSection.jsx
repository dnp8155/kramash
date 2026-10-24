import { useState, useEffect } from "react";
import UpgradeButton from "@/components/common/UpgradeButton";
import ProTag from "@/components/common/ProTag";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { themes } from "@/constants/preferencesConfig";
import Toggle from "@/components/common/Toggle";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import PastelPalettePicker from "@/components/settings/PastelPalettePicker";
import { applyTheme, saveTheme, resolvePastelHex } from "@/lib/theme";
import { useFeatureGate } from "@/components/common/ProGate";
import { cn } from "@/lib/utils";

export default function AppearanceSection() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const prefs = useDisplayPreferences();
  const { isPro, checkFeature, FeatureGateDialog } = useFeatureGate();

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "Contact Sheet";
    return localStorage.getItem("app-theme") || "Contact Sheet";
  });

  const pastelHex = resolvePastelHex(prefs);
  useEffect(() => {
    saveTheme(theme, pastelHex);
    applyTheme(theme, pastelHex);
  }, [theme, pastelHex]);

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

  const gatedSetPref = (key) => async (v) => {
    if (!checkFeature("event_display_customization_enabled", "Display Customization")) return;
    return setPref(key)(v);
  };

  const PRO_THEMES = ["Night", "Pastel"];
  const handleTheme = (t) => {
    if (PRO_THEMES.includes(t) && !isPro) { checkFeature("advanced_theme_enabled", "Night & Pastel themes"); return; }
    setTheme(t);
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const isProTheme = PRO_THEMES.includes(t);
            const locked = isProTheme && !isPro;
            return (
              <button
                key={t}
                onClick={() => handleTheme(t)}
                className={cn(
                  "relative px-3 py-2 rounded-md text-sm border transition-colors",
                  theme === t ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40",
                  locked && "opacity-60"
                )}
              >
                {t}
                {locked && <span className="absolute -top-2 right-1.5 rounded bg-card"><ProTag /></span>}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <ProTag />
            <span className="flex-1 min-w-0">Night & Pastel themes are Pro features.</span>
            <UpgradeButton />
          </div>
        )}
        {theme === "Pastel" && isPro && <PastelPalettePicker />}
      </div>
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">Display</h3>
          {!isPro && <ProTag />}
        </div>
        <div className="space-y-3">
          <ToggleRow label="Show event status" hint="Event status colors (Upcoming, In Progress, Completed, Cancelled)" checked={prefs.showProgressIndicators} onChange={gatedSetPref("showProgressIndicators")} locked={!isPro} onLocked={() => checkFeature("event_display_customization_enabled", "Display Customization")} />
          <ToggleRow label="Show member type" hint="Show team member type tags (e.g. Designer, Developer) on event cards and table rows" checked={prefs.showMemberTypeColors} onChange={gatedSetPref("showMemberTypeColors")} locked={!isPro} onLocked={() => checkFeature("event_display_customization_enabled", "Display Customization")} />
          <ToggleRow label="Show status dots" hint="Colored dots before event & team names — turn off to remove all dots" checked={prefs.showStatusDots} onChange={gatedSetPref("showStatusDots")} locked={!isPro} onLocked={() => checkFeature("event_display_customization_enabled", "Display Customization")} />
          <ToggleRow label="Group upcoming events" hint="Show events grouped by This Week / All, or as a flat list" checked={prefs.groupUpcoming} onChange={gatedSetPref("groupUpcoming")} locked={!isPro} onLocked={() => checkFeature("event_display_customization_enabled", "Display Customization")} />
          <ToggleRow label="Show Self on top" hint="Team page: keep your own (Self) card first. Turn off to list everyone A–Z" checked={prefs.selfOnTop} onChange={setPref("selfOnTop")} />
          <ToggleRow label="Show menubar labels" hint="Show text labels under icons in the mobile bottom navigation" checked={prefs.showMenubarLabels} onChange={gatedSetPref("showMenubarLabels")} locked={!isPro} onLocked={() => checkFeature("event_display_customization_enabled", "Display Customization")} />
        </div>
      </div>
      {FeatureGateDialog}
    </div>
  );
}

// A locked row is a Pro option on the Free plan: dimmed and not clickable (the section heading carries the Pro tag).
function ToggleRow({ label, hint, checked, onChange, locked, onLocked }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", locked && "opacity-60 cursor-pointer")} onClick={locked ? onLocked : undefined}>
      <div className={cn("min-w-0", locked && "pointer-events-none")}>
        <span className="text-sm text-foreground block">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={locked} className={locked ? "pointer-events-none" : undefined} />
    </div>
  );
}