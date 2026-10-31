import { describe, it, expect } from "vitest";
import { parseGroups, packageTotal, lineTotal, buildStructure, newItem, addItemToGeneral, clientSections, packagePrice, parseOverride, hasMargin } from "@/lib/packageStructure";

const row = (over) => ({ ...newItem("custom"), ...over });

describe("package structure", () => {
  it("reads a saved structure and survives bad data", () => {
    expect(parseGroups("")).toEqual([]);
    expect(parseGroups("not json")).toEqual([]);
    expect(parseGroups('[{"day_date":"uncategorized","items":[{"name":"A"}]}]')[0].items).toHaveLength(1);
  });

  it("totals rate x quantity x days across every group", () => {
    const groups = [
      { day_date: "uncategorized", items: [row({ name: "A", unit_rate: 1000, quantity: 2, days: 3, rate_type: "Per Day" })] },
      { day_date: "2026-01-02", items: [row({ name: "B", unit_rate: 500 })] },
    ];
    expect(packageTotal(groups)).toBe(6500);
  });

  it("drops unnamed rows and empty groups, and cleans numbers", () => {
    const out = JSON.parse(buildStructure([
      { day_date: "uncategorized", phase_title: "", items: [row({ name: "  Album ", quantity: "", days: 0, unit_rate: "-5" }), row({ name: "" })] },
      { day_date: "2026-01-02", phase_title: "", items: [row({ name: "" })] },
    ]));
    expect(out).toHaveLength(1);
    expect(out[0].items).toEqual([expect.objectContaining({ name: "Album", quantity: 1, days: 1, unit_rate: 0 })]);
    expect(buildStructure([{ day_date: "uncategorized", items: [row({ name: "" })] }])).toBe("");
  });

  it("adds a row to the general group, creating it when missing", () => {
    expect(addItemToGeneral([], row({ name: "X" }))[0].day_date).toBe("uncategorized");
    const g = [{ day_date: "2026-01-02", items: [] }, { day_date: "uncategorized", items: [row({ name: "A" })] }];
    expect(addItemToGeneral(g, row({ name: "B" }))[1].items).toHaveLength(2);
  });

  it("builds the client view: day titles, no people, optional prices, includes", () => {
    const groups = [
      { day_date: "uncategorized", items: [row({ name: "Album", unit_rate: 9000 })] },
      { day_date: "2026-01-02", phase_title: "", items: [row({ name: "Photographer", item_type: "role", unit_rate: 5000, quantity: 2, days: 2, rate_type: "Per Day", team_member_name_snapshot: "Ravi" })] },
      { day_date: "__includes__", items: [row({ name: "Soft copies", quantity: 2 })] },
    ];
    const plain = clientSections(groups);
    expect(plain.sections.map((s) => s.title)).toEqual(["", "Day 1"]);
    expect(plain.sections[1].lines[0]).toMatchObject({ name: "Photographer", detail: "2 nos · 2 days", amount: null });
    expect(JSON.stringify(plain)).not.toContain("Ravi");
    expect(plain.includes).toEqual(["2× Soft copies"]);
    expect(clientSections(groups, { prices: true }).sections[1].lines[0].amount).toBe(20000);
  });
});

describe("package amounts match the quotation", () => {
  it("multiplies days only for Per Day rates", () => {
    const base = { unit_rate: 1000, quantity: 2, days: 3 };
    expect(lineTotal(row({ ...base, rate_type: "Per Day" }))).toBe(6000);
    expect(lineTotal(row({ ...base, rate_type: "Per Event" }))).toBe(2000);
    expect(lineTotal(row({ ...base, rate_type: "Fixed" }))).toBe(2000);
    expect(packageTotal([{ day_date: "uncategorized", items: [row({ ...base, rate_type: "Per Day" }), row({ ...base, rate_type: "Fixed" })] }])).toBe(8000);
  });

  it("shows days on the client card only when they count", () => {
    const g = [{ day_date: "uncategorized", items: [row({ name: "Shoot", quantity: 1, days: 3, rate_type: "Per Event" }), row({ name: "Crew", quantity: 1, days: 3, rate_type: "Per Day" })] }];
    const lines = clientSections(g).sections[0].lines;
    expect(lines[0].detail).toBe("");
    expect(lines[1].detail).toBe("3 days");
  });
});

describe("package price (margin)", () => {
  const groups = [{ day_date: "uncategorized", items: [row({ name: "A", unit_rate: 1000 }), row({ name: "B", unit_rate: 500 })] }];

  it("is the items total unless a price is typed in", () => {
    expect(packagePrice(groups, null)).toBe(1500);
    expect(packagePrice(groups, "")).toBe(1500);
    expect(packagePrice(groups, undefined)).toBe(1500);
    expect(packagePrice(groups, "2000")).toBe(2000);
    expect(packagePrice(groups, 0)).toBe(0);
  });

  it("ignores junk and never goes negative", () => {
    expect(parseOverride("abc")).toBeNull();
    expect(parseOverride("-5")).toBe(0);
    expect(parseOverride(2500.5)).toBe(2500.5);
  });

  it("flags a margin only when the price really differs from the items", () => {
    expect(hasMargin(groups, null)).toBe(false);
    expect(hasMargin(groups, 1500)).toBe(false);
    expect(hasMargin(groups, 2000)).toBe(true);
    expect(hasMargin(groups, 1000)).toBe(true);
  });
});
