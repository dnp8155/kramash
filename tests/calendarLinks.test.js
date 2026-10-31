import { describe, it, expect } from "vitest";
import { buildIcs, eventDays, datesBetween, googleCalendarUrl } from "@/lib/calendarLinks";

describe("calendar links", () => {
  it("expands a start and end date, across a month end", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(datesBetween("2026-10-30", null)).toEqual(["2026-10-30"]);
  });

  it("makes one entry per day, labelled like the By date plan", () => {
    const days = eventDays({ title: "Sharma Wedding", dates: ["2026-12-26", "2026-12-24", "2026-12-25", "2026-12-24"], dayTitles: { "2026-12-25": "Wedding" } });
    expect(days.map((d) => d.summary)).toEqual(["Sharma Wedding – Day 1 of 3", "Sharma Wedding – Day 2: Wedding", "Sharma Wedding – Day 3 of 3"]);
    expect(eventDays({ title: "Shoot", dates: ["2026-12-24"] })[0].summary).toBe("Shoot");
    expect(eventDays({ title: "Shoot", dates: ["2026-12-24"], dayTitles: { "2026-12-24": "Reception" } })[0].summary).toBe("Shoot – Reception");
  });

  it("writes an all-day entry per day ending the day after, with no amounts", () => {
    const ics = buildIcs({ title: "Sharma, Wedding", dates: ["2026-12-24", "2026-12-25", "2026-12-30"], venue: "Hall, Vadodara", uid: "ev1", description: "Your role: Lead" });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261224");
    expect(ics).toContain("DTEND;VALUE=DATE:20261225");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261230");
    expect(ics).toContain("DTEND;VALUE=DATE:20261231");
    expect(ics).toContain("SUMMARY:Sharma\\, Wedding – Day 1 of 3");
    expect(ics).toContain("LOCATION:Hall\\, Vadodara");
    expect(ics).not.toMatch(/₹|\bRs\b|price|amount/i);
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("folds long lines", () => {
    const ics = buildIcs({ title: "x".repeat(200), dates: ["2026-12-24"] });
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("builds a Google link for one day, or none for an unknown day", () => {
    const ev = { title: "Wedding", dates: ["2026-12-24", "2026-12-25"], venue: "Hall" };
    const url = googleCalendarUrl(ev, "2026-12-25");
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("dates=20261225%2F20261226");
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain("Wedding – Day 2 of 2");
    expect(googleCalendarUrl(ev, "2027-01-01")).toBeNull();
  });
});
