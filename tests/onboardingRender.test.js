import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
// Render-time crashes (a value used before it is defined, hooks in the wrong place) only show up when the page is
// actually rendered. The form is hidden behind "checking for a workspace" at first, so start that flag as false.
vi.mock("react", async (orig) => {
  const real = await orig();
  return { ...real, useState: (init) => real.useState(init === true ? false : init) };
});
vi.mock("react-router-dom", () => ({ useNavigate: () => () => {}, Link: ({ children }) => h("a", null, children) }));
vi.mock("@/api/base44Client", () => ({ base44: { entities: {}, auth: {} } }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: () => ({}), functions: { invoke: () => Promise.resolve() } } }));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ user: null, checkUserAuth: () => {} }) }));
vi.mock("@/lib/savingTracker", () => ({ trackSaving: (f) => f() }));

import Onboarding from "@/pages/Onboarding";

describe("onboarding page", () => {
  it("renders the first step (business types) without crashing", () => {
    const html = renderToString(h(Onboarding));
    expect(html).toContain("Continue");
    expect(html).toContain("Photography");
  });
});
