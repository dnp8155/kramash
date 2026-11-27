// Track settings kept with the workspace's display preferences (Preferences → Types & Display → Track):
// showTrackTab (on by default) and trackStatusNames, the business's own names for the last two statuses.
// Handles display_preferences stored either as an object or as a JSON string.
export const DEFAULT_TRACK_LABELS = ["Sent to client", "Delivered"];

export function trackSettings(workspace: any): { enabled: boolean; labels: string[] } {
  let prefs: any = workspace?.display_preferences;
  if (typeof prefs === "string") { try { prefs = JSON.parse(prefs); } catch { prefs = {}; } }
  if (!prefs || typeof prefs !== "object") prefs = {};
  const names = Array.isArray(prefs.trackStatusNames) ? prefs.trackStatusNames : [];
  const labels = DEFAULT_TRACK_LABELS.map((d, i) => (typeof names[i] === "string" && names[i].trim() ? names[i].trim().slice(0, 20) : d));
  return { enabled: prefs.showTrackTab !== false, labels };
}
