import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { themes } from "@/constants/preferencesConfig";
import Toggle from "@/components/common/Toggle";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import PastelPalettePicker from "@/components/settings/PastelPalettePicker";
import { hexToHsl } from "@/lib/pastelTheme";
import { useFeatureGate } from "@/components/common/ProGate";
import { DEFAULT_PASTEL_COLORS } from "@/lib/pastelTheme";
import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
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

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "Night") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("app-theme", theme);

    // Pastel theme — apply the selected pastel color as primary/accent/ring tokens
    if (theme === "Pastel") {
      const palette = prefs.pastelPalette?.length > 0 ? prefs.pastelPalette : DEFAULT_PASTEL_COLORS;
      const idx = prefs.pastelThemeIndex ?? 0;
      const activeColor = palette[idx] || palette[0];
      if (activeColor) {
        try {
          const { h, s, l } = hexToHsl(activeColor);
          root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
          root.style.setProperty("--primary-hover", `${h} ${s}% ${Math.max(0, l - 7)}%`);
          root.style.setProperty("--primary-foreground", "220 26% 14%");
          root.style.setProperty("--accent", `${h} ${s}% ${l}%`);
          root.style.setProperty("--accent-foreground", "220 26% 14%");
          root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
          root.style.setProperty("--sidebar-primary", `${h} ${s}% ${l}%`);
          root.style.setProperty("--sidebar-primary-foreground", "220 26% 14%");
        } catch {}
      }
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-hover");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-primary-foreground");
    }
  }, [theme, prefs.pastelPalette, prefs.pastelThemeIndex, workspace]);

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
    if (PRO_THEMES.includes(t) && !isPro) return;
    setTheme(t);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-5">
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
                  locked && "opacity-60 cursor-not-allowed"
                )}
              >
                {t}
                {isProTheme && (
                  <span className="absolute top-1 right-1 inline-flex items-center">
                    <Crown className="w-3 h-3 text-warning" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-warning" />
            Night & Pastel themes are Pro features.{" "}
            <Link to="/plan" className="font-semibold text-warning underline">Upgrade</Link>
          </p>
        )}
        {theme === "Pastel" && isPro && <PastelPalettePicker />}
      </div>
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">Display</h3>
          {!isPro && (
            <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </div>
        <div className="space-y-3">
          <ToggleRow label="Show event status" hint="Event status colors (Upcoming, In Progress, Completed, Cancelled)" checked={prefs.showProgressIndicators} onChange={gatedSetPref("showProgressIndicators")} />
          <ToggleRow label="Show member type colors" hint="Color-code team member type tags (Bride Side, Groom Side, etc.)" checked={prefs.showMemberTypeColors} onChange={gatedSetPref("showMemberTypeColors")} />
          <ToggleRow label="Show status dots" hint="Colored dots before event & team names — turn off to remove all dots" checked={prefs.showStatusDots} onChange={gatedSetPref("showStatusDots")} />
          <ToggleRow label="Group upcoming events" hint="Show events grouped by This Week / All, or as a flat list" checked={prefs.groupUpcoming} onChange={gatedSetPref("groupUpcoming")} />
          <ToggleRow label="Show menubar labels" hint="Show text labels under icons in the mobile bottom navigation" checked={prefs.showMenubarLabels} onChange={gatedSetPref("showMenubarLabels")} />
        </div>
      </div>
      {FeatureGateDialog}
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