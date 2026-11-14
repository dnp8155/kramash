import { describe, it, expect } from "vitest";
import { findDateConflicts } from "@/lib/teamService";
import { openRoleSlots } from "@/lib/openRoleSlots";
import { searchLocations, copyCount, parseSubfolders } from "@/lib/storageService";
import { faqContent, plainAnswer } from "@/constants/faqContent";
import { isEventLocked, lockErrorMessage, isLockError } from "@/lib/transactionLock";

describe("team conflicts use only the selected dates", () => {
  const events = {
    e1: { id: "e1", status: "upcoming", start_date: "2026-11-22", end_date: "2026-12-11", event_dates: ["2026-11-22", "2026-12-09", "2026-12-10", "2026-12-11"] },
  };
  const assignments = [{ team_member_id: "m1", event_id: "e1", assignment_status: "assigned" }];
  it("no clash on a gap day of a non-consecutive event", () => {
    expect(findDateConflicts("m1", ["2026-11-29"], assignments, events, "e2")).toEqual([]);
  });
  it("clashes on a real booked day, and reports which", () => {
    const hit = findDateConflicts("m1", ["2026-11-29", "2026-12-10"], assignments, events, "e2");
    expect(hit).toHaveLength(1);
    expect(hit[0].dates).toEqual(["2026-12-10"]);
  });
  it("ignores removed assignments and cancelled events", () => {
    expect(findDateConflicts("m1", ["2026-12-10"], [{ ...assignments[0], assignment_status: "removed" }], events, "e2")).toEqual([]);
    expect(findDateConflicts("m1", ["2026-12-10"], assignments, { e1: { ...events.e1, status: "cancelled" } }, "e2")).toEqual([]);
  });
});

describe("quoted role filled by a differently named assignment", () => {
  const quote = [{ item_type: "team", description: "Hybrid Photographer", day_date: "2026-11-09", team_member_id: null }];
  const ev = { id: "e", start_date: "2026-11-09", end_date: "2026-11-12", event_dates: ["2026-11-09", "2026-11-12"] };
  it("is filled when the person is booked on the quoted date", () => {
    const asg = [{ role_name_snapshot: "Photographer", booking_start_date: "2026-11-09", booking_end_date: "2026-11-12" }];
    expect(openRoleSlots(quote, asg, ev)).toHaveLength(0);
  });
  it("stays open when the person is not booked that day", () => {
    const asg = [{ role_name_snapshot: "Photographer", booking_start_date: "2026-11-12", booking_end_date: "2026-11-12" }];
    expect(openRoleSlots(quote, asg, ev)).toHaveLength(1);
  });
});

describe("storage search", () => {
  const rows = [
    { id: 1, _searchText: "Drive A Weddings 2026 RAW Selects Sharma Wedding Priya Sharma" },
    { id: 2, _searchText: "Drive B Patel Reception edited" },
  ];
  it("needs every word, in any order", () => {
    expect(searchLocations(rows, "sharma raw").map((r) => r.id)).toEqual([1]);
    expect(searchLocations(rows, "raw sharma wedding").map((r) => r.id)).toEqual([1]);
    expect(searchLocations(rows, "sharma patel")).toEqual([]);
  });
  it("forgives a one-letter typo in longer words", () => {
    expect(searchLocations(rows, "sharama").map((r) => r.id)).toEqual([1]);
  });
  it("returns everything for an empty query", () => {
    expect(searchLocations(rows, "  ")).toHaveLength(2);
  });
  it("counts copies by distinct drive and parses subfolders", () => {
    expect(copyCount([{ drive_id: "a" }, { drive_id: "a" }, { drive_id: "b" }])).toBe(2);
    expect(parseSubfolders('[{"name":" RAW ","note":""},{"name":""}]')).toEqual([{ name: "RAW", note: "" }]);
  });
});

describe("FAQ links", () => {
  it("every in-answer question link points at a real question", () => {
    const slugs = new Set(faqContent.map((f) => f.slug));
    for (const f of faqContent) {
      for (const m of f.a.matchAll(/\]\(#([^)]+)\)/g)) expect(slugs.has(m[1]), `${f.q} -> ${m[1]}`).toBe(true);
    }
  });
  it("slugs are unique and link markup is stripped for plain text", () => {
    expect(new Set(faqContent.map((f) => f.slug)).size).toBe(faqContent.length);
    expect(plainAnswer("See [pricing](#x) and [Terms](/terms).")).toBe("See pricing and Terms.");
  });
});

describe("payment lock helpers", () => {
  it("locks completed and settled jobs only", () => {
    expect(isEventLocked({ status: "completed" })).toBe(true);
    expect(isEventLocked({ status: "upcoming", settled: true })).toBe(true);
    expect(isEventLocked({ status: "in-progress" })).toBe(false);
    expect(isEventLocked(null)).toBe(false);
  });
  it("turns database lock errors into the plain sentence", () => {
    const err = { message: "LOCKED_EVENT: This job is completed, so its payments can no longer be deleted." };
    expect(lockErrorMessage(err)).toBe("This job is completed, so its payments can no longer be deleted.");
    expect(isLockError(err)).toBe(true);
    expect(lockErrorMessage({ message: "network down" })).toBe("network down");
  });
});
