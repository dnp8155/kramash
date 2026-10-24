import { describe, it, expect } from "vitest";
import fs from "fs";
import { RELEASE_NOTES } from "@/constants/releaseNotes";
import { APP_CONFIG } from "@/lib/appConfig";

// The app version, the changelog and package.json must agree, and every icon a note names must exist in both places
// that draw it (the What's New sheet and the App Updates page) — otherwise it silently falls back to a sparkle.
const iconMap = (file) => {
  const src = fs.readFileSync(file, "utf8");
  const block = src.match(/const NOTE_ICONS = \{([\s\S]*?)\};/)[1];
  return new Set(block.split(/[\s,]+/).filter(Boolean));
};

describe("release notes", () => {
  it("has the current version first, matching the app version and package.json", () => {
    expect(APP_CONFIG.version).toBe("1.1.8.7");
    expect(RELEASE_NOTES[0].version).toBe(APP_CONFIG.version);
    expect(JSON.parse(fs.readFileSync("package.json", "utf8")).version).toBe(APP_CONFIG.version);
    expect(APP_CONFIG.versionLabel).toContain(APP_CONFIG.version);
  });

  it("lists versions newest first, without duplicates", () => {
    const versions = RELEASE_NOTES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    // 1.1.7.1 > 1.1.7: compare part by part, a missing part counts as 0.
    const cmp = (x, y) => {
      const A = x.split(".").map(Number), B = y.split(".").map(Number);
      for (let k = 0; k < Math.max(A.length, B.length); k++) { const d = (A[k] || 0) - (B[k] || 0); if (d) return d; }
      return 0;
    };
    for (let i = 1; i < versions.length; i++) expect(cmp(versions[i - 1], versions[i])).toBeGreaterThan(0);
    // dates never go backwards either
    for (let i = 1; i < RELEASE_NOTES.length; i++) expect(RELEASE_NOTES[i - 1].date >= RELEASE_NOTES[i].date).toBe(true);
  });

  it("gives every note in the newest release a title, description and a known icon", () => {
    const dialog = iconMap("src/components/common/WhatsNewDialog.jsx");
    const page = iconMap("src/pages/AppUpdates.jsx");
    for (const n of RELEASE_NOTES[0].notes) {
      expect(typeof n).toBe("object");
      expect(n.title.length).toBeGreaterThan(3);
      expect(n.description.length).toBeGreaterThan(20);
      expect(dialog.has(n.icon)).toBe(true);
      expect(page.has(n.icon)).toBe(true);
    }
  });
});
