// Keeps the browser/PWA chrome (iOS/Android status bar, notch area) in sync
// with the app's light/dark theme — matches --background in index.css.
const LIGHT_THEME_COLOR = "#F5F3EF";
const DARK_THEME_COLOR = "#0A0A0A";

export function applyThemeColor(isDark) {
  if (typeof document === "undefined") return;
  const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", color);
  });
}
