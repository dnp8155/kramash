// Reads the pastel theme state: whether the "Pastel" theme is active (from localStorage,
// matching AppearanceSection's theme handling) and the workspace's saved palette
// (from display_preferences, falling back to the category default).
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { getDefaultPalette, resolveEventTypeColor } from "@/lib/pastelTheme";

export function usePastelTheme() {
  const { workspace } = useWorkspace();
  const prefs = useDisplayPreferences();
  const theme = typeof window !== "undefined" ? localStorage.getItem("app-theme") : null;
  const isActive = theme === "Pastel";

  const category = workspace?.business_category || "OTHER";
  const defaultPalette = getDefaultPalette(category);
  const palette =
    prefs.pastelPalette && Array.isArray(prefs.pastelPalette) && prefs.pastelPalette.length > 0
      ? prefs.pastelPalette
      : defaultPalette;

  const getColorForType = (type) => resolveEventTypeColor(type, palette);

  return { isActive, palette, getColorForType, category, defaultPalette };
}