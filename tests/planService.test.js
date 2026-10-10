import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake database: plans + limits, and one workspace subscription per test.
const db = { plans: [], pricings: [], limits: [], subs: [], me: { email: "owner@example.com" }, failPlans: false };
vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: { me: async () => db.me },
    entities: {
      Plan: { list: async () => { if (db.failPlans) throw new Error("429"); return db.plans; } },
      PlanPricing: { list: async () => db.pricings },
      PlanLimit: { list: async () => db.limits },
      WorkspaceSubscription: { filter: async () => db.subs },
    },
  },
}));
vi.mock("@/lib/staggeredLoader", () => ({
  staggeredAllSettled: async (fns) => Promise.all(fns.map((f) => f().then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason })))),
}));

import { resolveWorkspacePlan, clearPlanConfigCache } from "@/lib/planService";

const iso = (offsetDays) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

beforeEach(() => {
  clearPlanConfigCache();
  Object.assign(db, {
    failPlans: false,
    me: { email: "owner@example.com" },
    plans: [{ id: "free", code: "FREE" }, { id: "pro", code: "PRO" }],
    // 1 month, 6 months and 1 year are three prices of the SAME Pro plan.
    pricings: [
      { id: "p1", plan_id: "pro", billing_cycle: "MONTHLY" },
      { id: "p6", plan_id: "pro", billing_cycle: "SIX_MONTHS" },
      { id: "p12", plan_id: "pro", billing_cycle: "ANNUAL" },
    ],
    limits: [
      { plan_id: "free", limit_key: "max_team_members", limit_value: "3", enabled: true },
      { plan_id: "pro", limit_key: "max_team_members", limit_value: "999999", enabled: true },
    ],
    subs: [],
  });
});

describe("Pro plan resolution", () => {
  for (const [label, pricing] of [["1 month", "p1"], ["6 months", "p6"], ["1 year", "p12"]]) {
    it(`${label} Pro resolves to PRO with unlimited team members`, async () => {
      db.subs = [{ plan_id: "pro", pricing_id: pricing, status: "ACTIVE", expires_at: iso(30) }];
      const plan = await resolveWorkspacePlan("ws1");
      expect(plan.planCode).toBe("PRO");
      expect(plan.isExpired).toBe(false);
      expect(plan.limits.max_team_members).toBe(999999);
    });
  }

  it("is still Pro on the LAST day of the subscription", async () => {
    db.subs = [{ plan_id: "pro", status: "ACTIVE", expires_at: iso(0) }];
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("PRO");
  });

  it("falls back to Free the day after it expires", async () => {
    db.subs = [{ plan_id: "pro", status: "ACTIVE", expires_at: iso(-1) }];
    const plan = await resolveWorkspacePlan("ws1");
    expect(plan.planCode).toBe("FREE");
    expect(plan.isExpired).toBe(true);
    expect(plan.limits.max_team_members).toBe(3);
  });

  it("a workspace with no subscription is Free", async () => {
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("FREE");
  });

  it("a failed plan-list load never turns into a cached 'everyone is Free'", async () => {
    db.subs = [{ plan_id: "pro", status: "ACTIVE", expires_at: iso(30) }];
    db.failPlans = true;
    await expect(resolveWorkspacePlan("ws1")).rejects.toThrow();
    db.failPlans = false; // the next attempt must work and see Pro
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("PRO");
  });
});

describe("Subscription status: only an ACTIVE, in-date subscription is Pro", () => {
  for (const status of ["EXPIRED", "CANCELLED", "SUSPENDED"]) {
    it(`${status} Pro is treated as Free (even with a future expiry date)`, async () => {
      db.subs = [{ plan_id: "pro", status, expires_at: iso(30) }];
      const plan = await resolveWorkspacePlan("ws1");
      expect(plan.planCode).toBe("FREE");
      expect(plan.limits.max_team_members).toBe(3);
    });
  }

  it("a suspended workspace says so (for the Your Plan page)", async () => {
    db.subs = [{ plan_id: "pro", status: "SUSPENDED", expires_at: iso(30) }];
    expect((await resolveWorkspacePlan("ws1")).planStatus).toBe("suspended");
  });

  it("renewing: the new ACTIVE Pro wins over an older expired one", async () => {
    db.subs = [
      { plan_id: "pro", status: "ACTIVE", expires_at: iso(60) },
      { plan_id: "pro", status: "ACTIVE", expires_at: iso(-10) },
    ];
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("PRO");
  });

  it("after an admin downgrade (old Pro CANCELLED, new Free ACTIVE) it is Free", async () => {
    db.subs = [
      { plan_id: "free", status: "ACTIVE", expires_at: "" },
      { plan_id: "pro", status: "CANCELLED", expires_at: iso(30) },
    ];
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("FREE");
  });
});

// The rows the admin edge functions leave behind (assignProSubscription, downgradeToFree, adminSetWorkspaceStatus),
// newest first, exactly as the app reads them.
describe("Admin actions: make Pro / revert to Free / suspend", () => {
  const showsTeamBanner = (plan) => {
    const limit = plan?.limits?.max_team_members;
    const hasLimit = limit != null && limit < 999999;
    return !(!plan || !hasLimit || plan.planCode === "PRO");
  };

  it("admin makes a Free workspace Pro → Pro, no upgrade banner", async () => {
    db.subs = [
      { plan_id: "pro", pricing_id: "p6", status: "ACTIVE", expires_at: iso(180) },   // new Pro (6 months)
      { plan_id: "free", status: "CANCELLED", expires_at: "" },                          // old Free, cancelled by the assignment
    ];
    const plan = await resolveWorkspacePlan("ws1");
    expect(plan.planCode).toBe("PRO");
    expect(showsTeamBanner(plan)).toBe(false);
  });

  it("admin reverts Pro to Free → Free, banner shows again", async () => {
    db.subs = [
      { plan_id: "free", status: "ACTIVE", expires_at: "" },
      { plan_id: "pro", status: "CANCELLED", expires_at: iso(180) },
    ];
    const plan = await resolveWorkspacePlan("ws1");
    expect(plan.planCode).toBe("FREE");
    expect(showsTeamBanner(plan)).toBe(true);
  });

  it("admin suspends a Pro workspace → treated as suspended/Free", async () => {
    db.subs = [{ plan_id: "pro", status: "SUSPENDED", expires_at: iso(180) }];
    const plan = await resolveWorkspacePlan("ws1");
    expect(plan.planStatus).toBe("suspended");
    expect(plan.planCode).toBe("FREE");
  });

  it("admin un-suspends → back to Pro, no banner", async () => {
    db.subs = [{ plan_id: "pro", status: "ACTIVE", expires_at: iso(180) }];
    const plan = await resolveWorkspacePlan("ws1");
    expect(plan.planCode).toBe("PRO");
    expect(showsTeamBanner(plan)).toBe(false);
  });

  it("admin makes a suspended workspace Pro → Pro (the new ACTIVE subscription wins)", async () => {
    db.subs = [
      { plan_id: "pro", status: "ACTIVE", expires_at: iso(30) },
      { plan_id: "pro", status: "SUSPENDED", expires_at: iso(5) },
    ];
    expect((await resolveWorkspacePlan("ws1")).planCode).toBe("PRO");
  });

  it("a Free workspace that is suspended stays suspended", async () => {
    db.subs = [{ plan_id: "free", status: "SUSPENDED", expires_at: "" }];
    expect((await resolveWorkspacePlan("ws1")).planStatus).toBe("suspended");
  });
});
