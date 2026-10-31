import { useState, useEffect, useRef, useLayoutEffect } from "react";
import UpgradeButton from "@/components/common/UpgradeButton";
import ProTag from "@/components/common/ProTag";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { themes } from "@/constants/preferencesConfig";
import Toggle from "@/components/common/Toggle";
import { useToast } from "@/components/ui/use-toast";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import PastelPalettePicker from "@/components/settings/PastelPalettePicker";
import { applyTheme, switchThemeAnimated, saveTheme, resolvePastelHex, pastelTokens } from "@/lib/theme";
import { DEFAULT_PASTEL_COLORS } from "@/lib/pastelTheme";
import { Sun, Moon, Palette, Check } from "lucide-react";
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
  const pastelPalette = Array.isArray(prefs.pastelPalette) && prefs.pastelPalette.length > 0 ? prefs.pastelPalette : DEFAULT_PASTEL_COLORS;
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
  const handleTheme = (t, e) => {
    if (PRO_THEMES.includes(t) && !isPro) { checkFeature("advanced_theme_enabled", "Night & Pastel themes"); return; }
    if (t === theme) return;
    const r = e?.currentTarget?.getBoundingClientRect();
    switchThemeAnimated(() => {
      applyTheme(t, pastelHex); // paint the new theme inside the transition; the effect above then just re-saves it
      setTheme(t);
    }, r && { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {themes.map((t) => {
            const locked = PRO_THEMES.includes(t) && !isPro;
            return <ThemeCard key={t} name={t} selected={theme === t} locked={locked} pastelHex={pastelHex} pastelPalette={pastelPalette} onClick={(e) => handleTheme(t, e)} />;
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

// Each theme is drawn in its own colours (a tiny app: sidebar, card, button), so the choice shows what you get.
const THEME_ICONS = { "Contact Sheet": Sun, Night: Moon, Pastel: Palette };
const THEME_PREVIEWS = {
  "Contact Sheet": { bg: "40 43% 97%", card: "0 0% 100%", line: "43 30% 90%", primary: "223 47% 41%", sidebar: "223 35% 15%" },
  Night: { bg: "222 28% 10%", card: "222 24% 14%", line: "222 18% 22%", primary: "223 55% 60%", sidebar: "222 30% 7%" },
};

// One line of text that slides slowly to show the rest when it does not fit (a long name in a narrow card on a phone),
// and stays still when it does. With reduced motion it is cut short with "…" instead.
function MarqueeLabel({ children }) {
  const box = useRef(null);
  const text = useRef(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !text.current) return;
      const extra = text.current.scrollWidth - box.current.clientWidth;
      setShift(extra > 1 ? Math.ceil(extra) : 0);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && box.current) ro.observe(box.current);
    return () => ro?.disconnect();
  }, [children]);
  return (
    <span ref={box} className="block min-w-0 flex-1 overflow-hidden">
      <span
        ref={text}
        className={cn("inline-block whitespace-nowrap text-xs font-medium text-foreground", shift > 0 && "label-marquee")}
        style={shift > 0 ? { "--label-shift": `-${shift}px`, animationDuration: `${Math.max(4, shift / 10 + 3)}s` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}

function ThemeCard({ name, selected, locked, pastelHex, pastelPalette, onClick }) {
  const Icon = THEME_ICONS[name] || Sun;
  let p = THEME_PREVIEWS[name];
  if (!p) {
    // Pastel follows the colour you picked.
    const tk = pastelTokens(pastelHex);
    p = { bg: tk["--background"], card: "0 0% 100%", line: tk["--border"], primary: tk["--primary"], sidebar: tk["--primary-strong"] };
  }
  const hsl = (v) => `hsl(${v})`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative text-left rounded-xl border p-1.5 transition-colors",
        selected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/40 bg-card",
        locked && "opacity-70"
      )}
    >
      <div className="h-[58px] rounded-lg overflow-hidden flex border" style={{ background: hsl(p.bg), borderColor: hsl(p.line) }}>
        <div className="w-3.5 shrink-0" style={{ background: hsl(p.sidebar) }} />
        <div className="flex-1 p-1.5 flex flex-col justify-between">
          <div className="h-5 rounded-[5px] border" style={{ background: hsl(p.card), borderColor: hsl(p.line) }} />
          {name === "Pastel" ? (
            // The pastel options themselves, with the chosen one ringed.
            <div className="flex items-center gap-[3px]">
              {pastelPalette.map((c) => (
                <span
                  key={c}
                  className="w-2 h-2 rounded-full"
                  style={{ background: c, boxShadow: c === pastelHex ? `0 0 0 1.5px ${hsl(p.card)}, 0 0 0 2.5px ${hsl(p.sidebar)}` : undefined }}
                />
              ))}
            </div>
          ) : (
            <div className="h-2 w-9 rounded-full" style={{ background: hsl(p.primary) }} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-1 pt-1.5 pb-0.5">
        <Icon className="w-3.5 h-3.5 shrink-0 text-foreground" />
        <MarqueeLabel>{name}</MarqueeLabel>
      </div>
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </span>
      )}
      {locked && <span className="absolute -top-2 right-2 rounded bg-card"><ProTag /></span>}
    </button>
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