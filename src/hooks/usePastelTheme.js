// Reads the pastel theme state: whether the "Pastel" theme is active (from localStorage,
// matching AppearanceSection's theme handling) and the workspace's saved palette
// (from display_preferences, falling back to the default 5 colors).
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { getDefaultPalette } from "@/lib/pastelTheme";

export function usePastelTheme() {
  const { workspace } = useWorkspace();
  const prefs = useDisplayPreferences();
  const theme = typeof window !== "undefined" ? localStorage.getItem("app-theme") : null;
  const isActive = theme === "Pastel";

  const defaultPalette = getDefaultPalette();
  const palette =
    prefs.pastelPalette && Array.isArray(prefs.pastelPalette) && prefs.pastelPalette.length > 0
      ? prefs.pastelPalette
      : defaultPalette;

  return { isActive, palette, defaultPalette };
}