import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
vi.mock("@/api/base44Client", () => ({ base44: { entities: {} } }));

import JobSheetDocument from "@/components/jobsheet/JobSheetDocument";

// Rendering is the check: the sheet must print each day's time (its own, else the event's) apart from the reporting time.
describe("job sheet timing", () => {
  const data = {
    event: { id: "e1", title: "Sharma Wedding", venue: "Hall", start_time: "09:00:00", end_time: "11:00:00", event_dates: ["2099-03-12", "2099-03-13"] },
    client: { name: "Sharma" },
    quotationItems: [],
    teamAssignments: [],
    dayAssignments: [{ event_id: "e1", date: "2099-03-13", start_time: "19:00:00", end_time: null }],
    membersById: {},
    eventDates: ["2099-03-12", "2099-03-13"],
  };
  const config = { date_configs: { "2099-03-13": { reporting_time: "6:00 PM" } } };
  it("prints Time for each day and keeps Reporting separate", () => {
    const html = renderToString(h(JobSheetDocument, { data, config, workspace: {} }));
    expect(html).toContain("Time:");
    expect(html).toContain("09:00 AM – 11:00 AM"); // 12 Mar follows the event
    expect(html).toContain("07:00 PM"); // 13 Mar has its own
    expect(html).toContain("Reporting:");
    expect(html).toContain("6:00 PM");
  });
  it("prints no Time line when nothing is set", () => {
    const html = renderToString(h(JobSheetDocument, { data: { ...data, event: { ...data.event, start_time: null, end_time: null }, dayAssignments: [] }, config: {}, workspace: {} }));
    expect(html).not.toContain("Time:");
  });
});
