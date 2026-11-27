// Events → Reminders: an event whose last day has passed and still owes money is listed in red ("— the event was
// yesterday"), not in the plain list with its date. Found 2026-11-25 with an event dated 24 Nov.
import { describe, it, expect, vi, beforeAll } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; globalThis.localStorage = { getItem: () => null, setItem: () => {} }; });
vi.mock("@/hooks/useT", () => ({ useT: () => (s) => s }));
vi.mock("@/hooks/useBusinessTerminology", () => ({ useBusinessTerminology: () => ({ workItemSingular: "Event" }) }));
vi.mock("@/lib/confirmDialog", () => ({ askConfirm: async () => true }));
vi.mock("@/lib/motionVariants", () => ({ EASE: [0, 0, 1, 1], useReducedMotion: () => true }));
// Plain elements instead of animations, so it renders on the server.
vi.mock("framer-motion", async () => {
  const { createElement, Fragment } = await import("react");
  const strip = ({ initial, animate, exit, transition, ...rest }) => rest;
  const motion = new Proxy({}, { get: (_, tag) => ({ children, ...p }) => createElement(tag, strip(p), children) });
  return { motion, AnimatePresence: ({ children }) => createElement(Fragment, null, children) };
});
// Render the list as if Reminders is open.
vi.mock("@/components/common/Collapse", () => ({ default: ({ children }) => h("div", null, children) }));

let ReminderBanner;
const ev = (id, title, date) => ({ id, title, start_date: date, end_date: date, status: "upcoming" });
beforeAll(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T10:00:00"));
  ({ default: ReminderBanner } = await import("@/components/events/ReminderBanner"));
});

// The class of the reminder line that holds `text` (its outer span ends in "leading-snug").
const lineClass = (html, text) => {
  const i = html.indexOf(text);
  expect(i, `"${text}" is listed`).toBeGreaterThan(-1);
  const j = html.lastIndexOf("leading-snug", i);
  return html.slice(html.lastIndexOf('class="', j), j + "leading-snug".length);
};

describe("finished events in Reminders", () => {
  it("client still owes: red, with 'the event was yesterday', even with 5+ older overdue events", () => {
    // What Events now passes: every finished event with a client due (no 5-item cap).
    const older = ["01", "02", "03", "04", "05", "06"].map((d) => ev(`o${d}`, `Old ${d}`, `2026-10-${d}`));
    const yesterday = ev("y", "Sharma Wedding", "2026-11-24");
    const dueReminders = [...older, yesterday].map((e) => ({ id: e.id, event: e, name: e.title, clientDue: 5000, teamServiceDue: 0 }));
    const html = renderToString(h(ReminderBanner, { dueReminders, pendingEvents: dueReminders.map((d) => ({ ...d })) }));
    expect(lineClass(html, "Sharma Wedding")).toContain("text-destructive");
    expect(html.slice(html.indexOf("Sharma Wedding"))).toMatch(/^[\s\S]{0,400}?the[\s\S]{0,40}event[\s\S]{0,40}was[\s\S]{0,40}yesterday/i);
  });

  it("client paid, team still due: red too, not the plain dated line", () => {
    const yesterday = ev("y", "Mehta Reception", "2026-11-24");
    const html = renderToString(h(ReminderBanner, { pendingEvents: [{ id: "y", event: yesterday, clientDue: 0, teamServiceDue: 3000 }] }));
    expect(lineClass(html, "Mehta Reception")).toContain("text-destructive");
    expect(html).toContain("still due to team/service providers.");
  });

  it("an event still ahead keeps the plain line with its date", () => {
    const later = ev("n", "Future Shoot", "2026-12-20");
    const html = renderToString(h(ReminderBanner, { pendingEvents: [{ id: "n", event: later, clientDue: 2000, teamServiceDue: 0 }] }));
    expect(lineClass(html, "Future Shoot")).not.toContain("text-destructive");
    expect(html).toContain("pending from the client.");
  });
});
