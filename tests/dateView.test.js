import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

// utils.js reads window at load; there is no browser here.
vi.hoisted(() => { globalThis.window = globalThis; });

// Rendering is the check: a name left behind after a refactor is a crash the moment the view opens.
vi.mock("@/api/base44Client", () => ({ base44: { entities: { EventDayAssignment: {}, JobSheet: {} } } }));
vi.mock("@/hooks/useT", () => ({ useT: () => (s) => s }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: () => {} }) }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));
vi.mock("@/components/common/MemberTypeTag", () => ({ default: ({ label }) => label || null }));
vi.mock("@/components/common/SegmentedTabs", () => ({ default: () => null }));
vi.mock("@/components/ui/popover", () => ({ Popover: ({ children }) => children, PopoverTrigger: ({ children }) => children, PopoverContent: () => null }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: () => null }));

import EventDateView from "@/components/events/EventDateView";

describe("By date view", () => {
  const event = { id: "e1", venue: "Main hall" };
  const base = {
    event,
    dates: ["2099-03-13", "2099-03-12"],
    workspaceId: "w1",
    eventAssignments: [{ id: "a1", team_member_id: "m1", assignment_status: "assigned", working_dates: ["2099-03-12"], role_name_snapshot: "Candid" }],
    allAssignments: [{ id: "x1", team_member_id: "m1", event_id: "e2", assignment_status: "assigned", working_dates: ["2099-03-12"] }],
    eventsById: { e1: event, e2: { id: "e2", title: "Corporate shoot" } },
    membersById: { m1: { id: "m1", name: "Asha" } },
    serviceAssignments: [{ id: "s1", service_id: "svc1", assignment_status: "assigned" }],
    services: [{ id: "svc1", name: "Candid photography" }],
    dayAssignments: [
      { id: "d1", event_id: "e1", date: "2099-03-12", status: "confirmed", notes: "Arrive early", venue_override: "Lawn" },
      { id: "d2", event_id: "e9", date: "2099-03-13", status: "done" },
    ],
    quoteTitles: { "2099-03-12": "Haldi" },
    jobSheet: { id: "j1", date_configs: JSON.stringify({ "2099-03-13": { venue_override: "Banquet" } }) },
    onChanged: () => {},
  };
  it("team: shows each day in order with title, venue, people, a clash hint, status chips and notes", () => {
    const html = renderToString(h(EventDateView, { ...base, kind: "team" }));
    expect(html.indexOf("12 Mar")).toBeLessThan(html.indexOf("13 Mar"));
    expect(html).toContain("Haldi");
    expect(html).toContain("Asha");
    expect(html).toContain("Also on");
    expect(html).toContain("Corporate shoot");
    expect(html).toContain("Lawn");
    expect(html).toContain("Banquet"); // the job sheet's venue for that date
    for (const s of ["Planned", "Confirmed", "Done", "Cancelled", "Notes"]) expect(html).toContain(s);
  });
  it("services: lists the day's services", () => {
    const html = renderToString(h(EventDateView, { ...base, kind: "services" }));
    expect(html).toContain("Candid photography");
    expect(html).toContain("Manage services for this day");
  });
  it("copes with no job sheet and bad job sheet data", () => {
    expect(() => renderToString(h(EventDateView, { ...base, kind: "team", jobSheet: null }))).not.toThrow();
    expect(() => renderToString(h(EventDateView, { ...base, kind: "team", jobSheet: { id: "j", date_configs: "not json" } }))).not.toThrow();
  });
});
