// Keeps the browser/PWA chrome (iOS/Android status bar, notch area) in sync
// with the app's light/dark theme — matches --background in index.css.
const LIGHT_THEME_COLOR = "#F5F3EF";
const DARK_THEME_COLOR = "#0A0A0A";

export function applyThemeColor(isDark, colorOverride) {
  if (typeof document === "undefined") return;
  const color = colorOverride || (isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    // iOS doesn't reliably repaint the status bar / safe-area chrome for an
    // installed PWA when an existing theme-color meta's `content` is mutated
    // in place — it only picks up the change on next launch. Swapping in a
    // fresh element (same attributes, new content) forces WebKit to re-read
    // it immediately instead of waiting for the app to be reopened.
    const fresh = meta.cloneNode(true);
    fresh.setAttribute("content", color);
    meta.replaceWith(fresh);
  });
}
