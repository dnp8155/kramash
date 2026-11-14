import { describe, it, expect } from "vitest";
import { toGb, fromGb, formatSize, driveUsage, driveBreakdown, overallUsage, biggestJobs } from "@/lib/storageService";

const A = { id: "a", capacity_gb: 1000 };
const B = { id: "b", capacity_gb: null };
const locs = [
  { id: "1", drive_id: "a", event_id: "e1", copy_role: "original", size_gb: 300 },
  { id: "2", drive_id: "a", event_id: "e2", copy_role: "backup", size_gb: 200 },
  { id: "3", drive_id: "a", event_id: "e2", copy_role: "original", size_gb: null },
  { id: "4", drive_id: "b", event_id: "e1", copy_role: "backup", size_gb: 50 },
];

describe("sizes", () => {
  it("converts typed sizes to GB and back", () => {
    expect(toGb("4", "TB")).toBe(4096);
    expect(toGb("512", "MB")).toBe(0.5);
    expect(toGb("1,500", "GB")).toBe(1500);
    expect(toGb("", "GB")).toBeNull();
    expect(fromGb(4096)).toEqual({ text: "4", unit: "TB" });
    expect(fromGb(0.5)).toEqual({ text: "512", unit: "MB" });
    expect(fromGb(120)).toEqual({ text: "120", unit: "GB" });
    expect(fromGb(null)).toEqual({ text: "", unit: "GB" });
  });
  it("formats sizes", () => {
    expect(formatSize(850)).toBe("850 GB");
    expect(formatSize(1536)).toBe("1.5 TB");
    expect(formatSize(0.25)).toBe("256 MB");
  });
});

describe("drive usage", () => {
  it("adds folder sizes into used, available and the unsized count", () => {
    expect(driveUsage(A, locs)).toMatchObject({ used: 500, unsized: 1, capacity: 1000, available: 500, percent: 50 });
    expect(driveUsage(B, locs)).toMatchObject({ used: 50, capacity: null, available: null, percent: null });
  });
  it("splits a drive by what each copy is", () => {
    expect(driveBreakdown(A, locs)).toEqual([{ role: "original", gb: 300 }, { role: "backup", gb: 200 }]);
  });
  it("counts totals only on drives whose size is known", () => {
    expect(overallUsage([A, B], locs)).toMatchObject({ capacity: 1000, used: 500, available: 500, usedAll: 550, usedOnUnsized: 50, unsizedDrives: 1 });
    expect(overallUsage([B], locs)).toMatchObject({ capacity: null, used: 50, available: null });
  });
  it("lists the biggest jobs first and skips jobs with no size", () => {
    expect(biggestJobs(locs).map((j) => [j.eventId, j.gb])).toEqual([["e1", 350], ["e2", 200]]);
    expect(biggestJobs(locs, 1)).toHaveLength(1);
  });
});
