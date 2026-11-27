import { describe, it, expect, vi } from "vitest";
const rows = { TeamMember: [], Service: [] };
vi.mock("@/api/base44Client", () => ({
  base44: { entities: {
    TeamMember: { filter: async () => rows.TeamMember },
    Service: { filter: async () => rows.Service },
  } },
}));
import { freshCapReached } from "@/lib/planGuard";

describe("freshCapReached (Save & add more, counted from the database)", () => {
  const plan = { limits: { max_team_members: 3, max_services: 5 } };
  it("stops adding once the database count plus this session's adds reaches the cap", async () => {
    rows.TeamMember = [{}, {}]; // 2 of 3 at the start
    const session = { base: null, added: 0 };
    expect(await freshCapReached(plan, "max_team_members", "w1", session)).toBeNull(); // first add allowed
    session.added = 1; // saved, but the database may not show it yet
    expect(await freshCapReached(plan, "max_team_members", "w1", session)).toEqual({ limit: 3, current: 3 });
  });
  it("uses the database count when it is already higher", async () => {
    rows.Service = [{}, {}, {}, {}, {}];
    expect(await freshCapReached(plan, "max_services", "w1", { base: null, added: 0 })).toEqual({ limit: 5, current: 5 });
  });
  it("does nothing for Pro or when it cannot count", async () => {
    expect(await freshCapReached({ limits: { max_services: 999999 } }, "max_services", "w1", { base: null, added: 0 })).toBeNull();
    expect(await freshCapReached(null, "max_services", "w1", { base: null, added: 0 })).toBeNull();
  });
});
