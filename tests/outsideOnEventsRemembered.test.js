// Events page → Work from others: the "Show on Events page" choice is remembered on the device per person, so a
// switched-off strip never flashes on open. Unknown (first open) = not shown until the profile answers.
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] ?? null,
};
const { rememberedShowOnEvents } = await import("../src/lib/outsideWork.js");
const signIn = (id) => { store["sb-proj-auth-token"] = JSON.stringify({ user: { id } }); };

describe("remembered Show on Events choice", () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });
  it("unknown until saved once (so nothing shows yet)", () => {
    signIn("u1");
    expect(rememberedShowOnEvents()).toBeUndefined();
  });
  it("off stays off for the same person", () => {
    signIn("u1");
    store["kramasha:outside-on-events"] = JSON.stringify({ uid: "u1", on: false });
    expect(rememberedShowOnEvents()).toBe(false);
  });
  it("another person's choice is not used", () => {
    signIn("u2");
    store["kramasha:outside-on-events"] = JSON.stringify({ uid: "u1", on: true });
    expect(rememberedShowOnEvents()).toBeUndefined();
  });
  it("signed out: unknown", () => {
    store["kramasha:outside-on-events"] = JSON.stringify({ uid: "u1", on: true });
    expect(rememberedShowOnEvents()).toBeUndefined();
  });
});
