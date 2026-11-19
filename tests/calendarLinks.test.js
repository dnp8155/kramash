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

describe("calendar links with day timing and venue", () => {
  const ev = {
    title: "Sharma Wedding", dates: ["2026-12-24", "2026-12-25"], venue: "Grand Hall", uid: "ev1",
    dayPlan: {
      start_time: "09:00", end_time: "11:00", venue_address: "MG Road, Vadodara",
      days: { "2026-12-25": { start_time: "19:00", end_time: "23:30", venue: "Lake Resort", title: "Reception" } },
    },
  };
  it("uses a day's own time and venue, else the common ones", () => {
    const [d1, d2] = eventDays(ev);
    expect([d1.start, d1.end, d1.place]).toEqual(["09:00", "11:00", "Grand Hall"]);
    expect([d2.start, d2.end, d2.place]).toEqual(["19:00", "23:30", "Lake Resort"]);
    expect(d2.summary).toBe("Sharma Wedding – Day 2: Reception");
  });
  it("writes timed entries; each day's place is its location and the description lists the days", () => {
    const ics = buildIcs(ev);
    expect(ics).toContain("DTSTART:20261224T090000");
    expect(ics).toContain("DTEND:20261224T110000");
    expect(ics).toContain("DTSTART:20261225T190000");
    expect(ics).toContain("DTEND:20261225T233000");
    expect(ics.match(/LOCATION:Grand Hall/g)).toHaveLength(1);
    expect(ics.match(/LOCATION:Lake Resort/g)).toHaveLength(1);
    const flat = ics.replace(/\r\n /g, "").replace(/\\n/g, "\n");
    expect(flat).toContain("Day 2 – Reception");
    expect(flat).toContain("Venue: Lake Resort");
  });
  it("lasts an hour with no end time, and rolls an overnight end to the next day", () => {
    const one = buildIcs({ title: "Shoot", dates: ["2026-12-24"], dayPlan: { start_time: "23:30", days: {} } });
    expect(one).toContain("DTSTART:20261224T233000");
    expect(one).toContain("DTEND:20261225T003000");
    const night = buildIcs({ title: "Party", dates: ["2026-12-24"], dayPlan: { start_time: "21:00", end_time: "02:00", days: {} } });
    expect(night).toContain("DTEND:20261225T020000");
  });
  it("falls back to the day's venue when the event has no main venue, and stays all-day without a time", () => {
    const ics = buildIcs({ title: "Shoot", dates: ["2026-12-24"], dayPlan: { days: { "2026-12-24": { venue: "Studio" } } } });
    expect(ics).toContain("LOCATION:Studio");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261224");
  });
  it("builds a timed Google link", () => {
    const url = googleCalendarUrl(ev, "2026-12-25");
    expect(url).toContain("dates=20261225T190000%2F20261225T233000");
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain("location=Lake Resort");
  });
});
