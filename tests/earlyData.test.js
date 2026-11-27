// Public pages start their data request at app boot (lib/earlyData.js) and the page reuses it:
// one server call per open, never two, and a different call is never answered with the early one.
import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = [];
vi.mock("@/lib/edgeFunction", () => ({
  invokeEdgeFunction: vi.fn(async (name, payload) => { calls.push([name, payload]); return { name, payload }; }),
}));
let portalSession = null;
let teamSession = null;
vi.mock("@/lib/portalSession", () => ({ getPortalSession: () => portalSession }));
vi.mock("@/lib/teamPortalSession", () => ({ getTeamPortalSession: () => teamSession }));
const rpc = [];
vi.mock("@/lib/clientPortalAccess", () => ({
  loadClientPortalData: async (t, c) => { rpc.push(["data", t, c]); return { data: true }; },
  loadClientPortalTracking: async () => { rpc.push(["tracking"]); return []; },
  loadClientPortalProvider: async () => { rpc.push(["provider"]); return {}; },
}));
vi.mock("@/lib/teamPortalAccess", () => ({
  loadTeamPortalData: async (t, m) => { rpc.push(["team", t, m]); return { team: true }; },
}));

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

async function boot(url) {
  vi.resetModules();
  const u = new URL(url, "https://www.kramasha.com");
  globalThis.window = { location: { pathname: u.pathname, search: u.search } };
  globalThis.sessionStorage = store();
  globalThis.localStorage = store();
  const mod = await import("@/lib/earlyData");
  mod.startEarlyData();
  return mod;
}

beforeEach(() => { calls.length = 0; rpc.length = 0; portalSession = null; teamSession = null; });

describe("early data for public pages", () => {
  const cases = [
    ["/track/abc", "getPublicEventData", { token: "abc" }],
    ["/job-sheet/abc", "getPublicJobSheet", { public_token: "abc" }],
    ["/job-sheet/abc?for=11111111-2222-3333-4444-555555555555&back=/outside-work", "getPublicJobSheet", { public_token: "abc", member_id: "11111111-2222-3333-4444-555555555555" }],
    ["/review/abc", "submitEventReview", { mode: "link", action: "get", token: "abc" }],
    ["/portal/abc", "getPortalData", { public_token: "abc", skip_tracking: false, password: "" }],
    ["/portal/abc?preview=1", "getPortalData", { public_token: "abc", skip_tracking: true, password: "" }],
    ["/q/abc", "clientViewQuotation", { public_token: "abc" }],
    ["/q/abc?preview=1", "clientViewQuotation", { public_token: "abc", skip_tracking: true }],
    ["/invoice/abc", "getPublicInvoice", { public_token: "abc" }],
    ["/p/my-studio", "getPublicProfile", { slug: "my-studio" }],
    ["/p/my-studio/inquiry", "getPublicProfile", { slug: "my-studio" }],
  ];
  for (const [url, name, payload] of cases) {
    it(`${url}: one call, reused by the page`, async () => {
      const { invokeEarly } = await boot(url);
      expect(calls).toEqual([[name, payload]]);
      const res = await invokeEarly(name, payload);
      expect(res).toEqual({ name, payload });
      expect(calls.length).toBe(1); // reused, not called again
      await invokeEarly(name, payload); // a later reload / retry makes its own call
      expect(calls.length).toBe(2);
    });
  }

  it("a different payload (e.g. a typed password) is never answered with the early request", async () => {
    const { invokeEarly } = await boot("/portal/abc");
    await invokeEarly("getPortalData", { public_token: "abc", skip_tracking: false, password: "secret" });
    expect(calls.length).toBe(2);
    expect(calls[1][1].password).toBe("secret");
  });

  it("does not start early when a link password is stored (the page handles it)", async () => {
    vi.resetModules();
    globalThis.window = { location: { pathname: "/portal/abc", search: "" } };
    globalThis.sessionStorage = store(); globalThis.sessionStorage.setItem("link_pw_abc", "pw");
    globalThis.localStorage = store();
    (await import("@/lib/earlyData")).startEarlyData();
    expect(calls.length).toBe(0);
    expect(globalThis.sessionStorage.getItem("link_pw_abc")).toBe("pw"); // untouched
  });

  it("quotation / invoice opened while signed in to the client portal are left to the page", async () => {
    portalSession = { token: "s", client_id: "c" };
    await boot("/q/abc");
    await boot("/invoice/abc");
    expect(calls.length).toBe(0);
  });

  it("client portal: data, tracking, provider and review start together and are reused", async () => {
    portalSession = { token: "s", client_id: "c" };
    const { runEarly, invokeEarly, clientPortalKey } = await boot("/client-portal");
    await new Promise((r) => setTimeout(r, 50)); // the portal loaders are fetched on demand
    expect(rpc.map((x) => x[0]).sort()).toEqual(["data", "provider", "tracking"]);
    expect(calls).toEqual([["submitEventReview", { mode: "client", action: "get", session_token: "s", client_id: "c" }]]);
    const fallback = vi.fn();
    expect(await runEarly(clientPortalKey("data", portalSession), fallback)).toEqual({ data: true });
    await invokeEarly("submitEventReview", { mode: "client", action: "get", session_token: "s", client_id: "c" });
    expect(fallback).not.toHaveBeenCalled();
    expect(calls.length).toBe(1);
  });

  it("team portal: reused once", async () => {
    teamSession = { token: "t", team_member_id: "m" };
    const { runEarly, teamPortalKey } = await boot("/team-portal");
    const fallback = vi.fn();
    expect(await runEarly(teamPortalKey(teamSession), fallback)).toEqual({ team: true });
    expect(fallback).not.toHaveBeenCalled();
    expect(rpc).toEqual([["team", "t", "m"]]);
  });

  it("no session / other pages: nothing starts", async () => {
    await boot("/client-portal");
    await boot("/team-portal");
    await boot("/events");
    await boot("/");
    expect(calls.length + rpc.length).toBe(0);
  });
});
