import { describe, it, expect } from "vitest";
import fs from "fs";
import { PLAN_LIMIT_DEFS, isBooleanLimit, isFlagOn, limitOrder, limitChangeWarning } from "@/constants/planLimits";

// The admin Plans page lists every setting from PLAN_LIMIT_DEFS. A setting that planService treats as an on/off flag
// must be drawn as a switch (otherwise the page shows an empty number box and can save a wrong value), and the other
// way round.
describe("plan limits catalogue", () => {
  const src = fs.readFileSync("src/lib/planService.js", "utf8");
  const serviceFlags = new Set([...src.match(/const BOOLEAN_KEYS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));

  it("draws exactly the flags planService knows as switches", () => {
    const catalogFlags = new Set(PLAN_LIMIT_DEFS.filter((d) => d.type === "boolean").map((d) => d.key));
    expect(catalogFlags).toEqual(serviceFlags);
  });

  it("gives every setting a label, a hint and a unique key", () => {
    const keys = PLAN_LIMIT_DEFS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of PLAN_LIMIT_DEFS) { expect(d.label.length).toBeGreaterThan(0); expect(d.hint.length).toBeGreaterThan(0); }
  });

  it("reads stored flags written as true/false or 1/0", () => {
    expect(isFlagOn("true")).toBe(true);
    expect(isFlagOn("1")).toBe(true);
    expect(isFlagOn("false")).toBe(false);
    expect(isFlagOn("0")).toBe(false);
    expect(isFlagOn("5")).toBe(false);
    expect(isBooleanLimit("client_email_enabled")).toBe(true);
    expect(isBooleanLimit("max_events")).toBe(false);
    expect(isBooleanLimit("something_new")).toBe(false);
  });

  it("puts settings the page does not know yet last", () => {
    expect(limitOrder("max_events")).toBeLessThan(limitOrder("client_email_enabled"));
    expect(limitOrder("something_new")).toBe(PLAN_LIMIT_DEFS.length);
  });

  it("asks before a change that reaches every customer on a plan", () => {
    const pro = { planCode: "PRO", planName: "Pro" }, free = { planCode: "FREE", planName: "Free" };
    expect(limitChangeWarning({ ...pro, key: "client_email_enabled", from: "true", to: "false" })).toMatch(/Turn off/);
    expect(limitChangeWarning({ ...pro, key: "client_email_enabled", from: "1", to: "false" })).toMatch(/Turn off/);
    expect(limitChangeWarning({ ...free, key: "client_email_enabled", from: "false", to: "true" })).toMatch(/Turn on/);
    expect(limitChangeWarning({ ...pro, key: "max_events", from: "999999", to: "50" })).toMatch(/Lower/);
  });

  it("does not ask for harmless changes", () => {
    const pro = { planCode: "PRO", planName: "Pro" }, free = { planCode: "FREE", planName: "Free" };
    expect(limitChangeWarning({ ...pro, key: "client_email_enabled", from: "false", to: "true" })).toBe("");
    expect(limitChangeWarning({ ...free, key: "client_email_enabled", from: "true", to: "false" })).toBe("");
    expect(limitChangeWarning({ ...free, key: "max_events", from: "5", to: "10" })).toBe("");
    expect(limitChangeWarning({ ...pro, key: "max_events", from: "50", to: "999999" })).toBe("");
  });
});
