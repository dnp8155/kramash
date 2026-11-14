import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => { globalThis.window = globalThis; });
const direct = { service: 0, member: 0 };
const invoke = vi.fn();
vi.mock("@/lib/edgeFunction", () => ({ invokeEdgeFunction: (...a) => invoke(...a) }));
vi.mock("@/api/base44Client", () => ({
  base44: { entities: {
    Service: { create: async (p) => { direct.service += 1; return { ...p, via: "direct" }; } },
    TeamMember: { create: async (p) => { direct.member += 1; return { ...p, via: "direct" }; }, filter: async () => [] },
  } },
}));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {}, default: {} }));

import { createService, createTeamMember } from "@/lib/clientEdgeFunctions";

describe("creating a service / team member goes through the server's plan check", () => {
  beforeEach(() => { invoke.mockReset(); direct.service = 0; direct.member = 0; });

  it("uses the server function and returns what it saved", async () => {
    invoke.mockResolvedValue({ id: "s1", via: "server" });
    expect(await createService({ workspace_id: "w", name: "Album" })).toMatchObject({ via: "server" });
    expect(invoke).toHaveBeenCalledWith("createService", expect.objectContaining({ name: "Album" }));
    expect(direct.service).toBe(0);
  });

  it("treats the server's 'plan limit reached' as final, without a direct save behind its back", async () => {
    invoke.mockRejectedValue({ status: 403, message: "PLAN_LIMIT_REACHED", data: { error: "PLAN_LIMIT_REACHED", limit: 3, current: 3 } });
    await expect(createTeamMember({ workspace_id: "w", name: "Ravi", color: "#fff" })).rejects.toMatchObject({ status: 403 });
    expect(direct.member).toBe(0);
  });

  it("falls back to the direct save only when the server function cannot be reached at all", async () => {
    invoke.mockRejectedValue({ message: "Failed to fetch" }); // no status: not an answer from the server
    expect(await createService({ workspace_id: "w", name: "Album" })).toMatchObject({ via: "direct" });
    expect(direct.service).toBe(1);
  });
});
