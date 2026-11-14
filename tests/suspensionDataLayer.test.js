import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: "visible" };
  globalThis.window.addEventListener = () => {};
  globalThis.window.removeEventListener = () => {};
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
});
const calls = [];
const chain = (table) => {
  const q = {
    insert: (r) => { calls.push(["insert", table]); return q; },
    update: () => { calls.push(["update", table]); return q; },
    delete: () => { calls.push(["delete", table]); return q; },
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    single: async () => ({ data: { id: "1" }, error: null }),
    then: (res) => res({ data: [], error: null }),
  };
  return q;
};
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (t) => chain(t),
    auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: { id: "u1" } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    storage: { from: () => ({ upload: async () => ({ data: {}, error: null }), getPublicUrl: () => ({ data: { publicUrl: "x" } }) }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  }),
}));
vi.mock("@/lib/supabaseConfig", () => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "k" }));

import { entities, storage } from "@/lib/supabaseClient";
import { invokeEdgeFunction } from "@/lib/edgeFunction";
import { setWorkspaceSuspended } from "@/lib/suspension";

describe("suspended workspace is read-only in the data layer", () => {
  beforeEach(() => { calls.length = 0; setWorkspaceSuspended(false); });

  it("reads still work while suspended", async () => {
    setWorkspaceSuspended(true);
    await expect(entities.Event.filter({ workspace_id: "w" })).resolves.toEqual([]);
    await expect(entities.Client.get("1")).resolves.toBeTruthy();
  });

  it("refuses creates, updates and deletes on business data, without touching the database", async () => {
    setWorkspaceSuspended(true);
    await expect(entities.Event.create({ title: "x" })).rejects.toMatchObject({ status: 403 });
    await expect(entities.Client.update("1", { name: "y" })).rejects.toThrow(/suspended/i);
    await expect(entities.Invoice.delete("1")).rejects.toThrow(/suspended/i);
    await expect(entities.Event.bulkCreate([{ title: "x" }])).rejects.toThrow(/suspended/i);
    await expect(entities.Workspace.update("w", { name: "n" })).rejects.toThrow(/suspended/i);
    await expect(storage.uploadPublic({ name: "a.png" })).rejects.toThrow(/suspended/i);
    expect(calls).toEqual([]);
  });

  it("still lets a suspended owner raise a support ticket", async () => {
    setWorkspaceSuspended(true);
    await expect(entities.SupportTicket.create({ subject: "help" })).resolves.toBeTruthy();
    expect(calls).toContainEqual(["insert", "support_tickets"]);
  });

  it("holds server functions that change things, and goes back to normal when re-activated", async () => {
    setWorkspaceSuspended(true);
    expect(() => invokeEdgeFunction("createEvent", {})).toThrow(/suspended/i);
    setWorkspaceSuspended(false);
    await expect(entities.Event.create({ title: "x" })).resolves.toBeTruthy();
    expect(calls).toContainEqual(["insert", "events"]);
  });
});
