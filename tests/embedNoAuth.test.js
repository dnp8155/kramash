import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

// AuthContext pulls in browser-only config; stub that, keep the real AuthContext + useT.
vi.mock("@/lib/supabaseClient", () => ({ default: {}, entities: {}, auth: {}, storage: {} }));
vi.mock("@/lib/app-params", () => ({ appParams: {} }));
vi.mock("@/api/base44Client", () => ({ base44: {} }));

// The embedded inquiry form has no AuthProvider; the "Multiple days" picker reads the language through useT.
describe("useT outside an AuthProvider", () => {
  it("falls back to English instead of throwing", async () => {
    const { useT } = await import("@/hooks/useT");
    const Probe = () => createElement("span", null, useT()("Start Date"));
    expect(renderToString(createElement(Probe))).toContain("Start Date");
  });
});
