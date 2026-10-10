import { useEffect } from "react";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { applyTheme, resolvePastelHex, saveTheme, THEME_KEY } from "@/lib/theme";

// Keeps the applied theme in step with the workspace's saved pastel colour on every
// page (not just Preferences), and caches the colour so the next load paints it first.
export function useThemeSync() {
  const prefs = useDisplayPreferences();
  const hex = resolvePastelHex(prefs);
  useEffect(() => {
    let theme = null;
    try { theme = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    if (!theme) return;
    saveTheme(theme, hex);
    applyTheme(theme, hex);
  }, [hex]);
}
