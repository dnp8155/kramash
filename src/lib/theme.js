// Single place that applies the app theme (Contact Sheet / Night / Pastel) to <html>.
// Used before React renders (main.jsx, from localStorage so there is no flash),
// by ThemeSync (once workspace preferences load) and by Preferences → Appearance.
import { applyThemeColor } from "@/lib/themeColor";
import { hexToHsl, DEFAULT_PASTEL_COLORS } from "@/lib/pastelTheme";

// "h s% l%" (as stored in the tokens) -> #rrggbb, for the browser/PWA chrome colour.
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const THEME_KEY = "app-theme";
export const PASTEL_COLOR_KEY = "app-pastel-color";

const PASTEL_VARS = [
  "--primary", "--primary-hover", "--primary-foreground", "--primary-strong",
  "--accent", "--accent-foreground", "--ring",
  "--background", "--secondary", "--muted", "--border", "--input",
  "--sidebar-primary", "--sidebar-primary-foreground",
];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const INK = "220 26% 14%"; // dark text used on pastel fills

// The colour the user actually picked: prefs palette (or defaults) at the saved index.
export function resolvePastelHex(prefs) {
  const palette = Array.isArray(prefs?.pastelPalette) && prefs.pastelPalette.length > 0 ? prefs.pastelPalette : DEFAULT_PASTEL_COLORS;
  return palette[prefs?.pastelThemeIndex ?? 0] || palette[0];
}

// Full token set derived from one pastel colour, so the whole app follows it:
//   primary       = the pastel itself (fills: buttons, active nav) with dark text on top
//   primary-strong= a deeper shade of the same hue for text/icons on white (readable)
//   background/muted/secondary/border = faint tints of the hue
export function pastelTokens(hex) {
  const { h, s, l } = hexToHsl(hex);
  const fill = `${h} ${s}% ${l}%`;
  return {
    "--primary": fill,
    "--primary-hover": `${h} ${s}% ${Math.max(0, l - 7)}%`,
    "--primary-foreground": INK,
    "--primary-strong": `${h} ${clamp(Math.round(s * 0.6), 35, 60)}% 30%`,
    "--accent": fill,
    "--accent-foreground": INK,
    "--ring": `${h} ${clamp(Math.round(s * 0.6), 35, 60)}% 45%`, // visible focus ring on white
    "--background": `${h} 45% 97%`,
    "--secondary": `${h} 40% 93%`,
    "--muted": `${h} 35% 94%`,
    "--border": `${h} 30% 88%`,
    "--input": `${h} 30% 88%`,
    "--sidebar-primary": fill,
    "--sidebar-primary-foreground": INK,
  };
}

export function applyTheme(theme, pastelHex) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = theme === "Night";
  root.classList.toggle("dark", isDark);

  const isPastel = theme === "Pastel" && /^#[0-9a-f]{6}$/i.test(pastelHex || "");
  // Status bar / notch follows the tinted page background under Pastel (matches --background).
  applyThemeColor(isDark, isPastel ? hslToHex(hexToHsl(pastelHex).h, 45, 97) : undefined);

  if (isPastel) {
    const tokens = pastelTokens(pastelHex);
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    root.setAttribute("data-theme", "pastel");
  } else {
    for (const k of PASTEL_VARS) root.style.removeProperty(k);
    root.removeAttribute("data-theme");
  }
}

// Called synchronously at startup from the values cached on this device.
export function applySavedTheme() {
  try {
    applyTheme(localStorage.getItem(THEME_KEY), localStorage.getItem(PASTEL_COLOR_KEY));
  } catch { /* storage unavailable */ }
}

export function saveTheme(theme, pastelHex) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    if (pastelHex) localStorage.setItem(PASTEL_COLOR_KEY, pastelHex);
  } catch { /* storage unavailable */ }
}
