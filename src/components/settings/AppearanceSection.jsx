import { useState, useEffect } from "react";
import { themes } from "@/constants/preferencesConfig";
import Toggle from "@/components/common/Toggle";
import { cn } from "@/lib/utils";

export default function AppearanceSection() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "Contact Sheet";
    return localStorage.getItem("app-theme") || "Contact Sheet";
  });
  const [toggles, setToggles] = useState({
    statusDots: true,
    groupUpcoming: true,
    eventStatus: true,
    menubarLabels: true,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "Night") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const setT = (key) => (v) => setToggles((p) => ({ ...p, [key]: v }));

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
      </div>
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold mb-3">Display</h3>
        <div className="space-y-3">
          <ToggleRow label="Show status dots" checked={toggles.statusDots} onChange={setT("statusDots")} />
          <ToggleRow label="Group upcoming events" checked={toggles.groupUpcoming} onChange={setT("groupUpcoming")} />
          <ToggleRow label="Show event status" checked={toggles.eventStatus} onChange={setT("eventStatus")} />
          <ToggleRow label="Show menubar labels" checked={toggles.menubarLabels} onChange={setT("menubarLabels")} />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}