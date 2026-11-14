import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

// utils.js reads window at load; there is no browser here.
vi.hoisted(() => { globalThis.window = globalThis; });

// Rendering the tab is the check: a name left behind after a refactor is a crash the moment the tab opens.
vi.mock("@/hooks/useT", () => ({ useT: () => (s) => s }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: () => {}, invalidateQueries: () => {} }) }));
vi.mock("@/components/messaging/EventMessagesCard", () => ({ default: () => null }));
vi.mock("@/components/events/EventStorageSummary", () => ({ default: () => null }));
vi.mock("@/components/common/StatusBadge", () => ({ default: () => null }));
vi.mock("@/components/common/SettledBadge", () => ({ default: () => null }));
vi.mock("@/lib/confirmDialog", () => ({ askConfirm: async () => true }));

import EventActivityTab from "@/components/events/EventActivityTab";

describe("Activity tab", () => {
  const props = {
    event: { id: "e1", status: "upcoming", start_date: "2099-03-12", end_date: "2099-03-13", event_dates: [] },
    workspaceId: "w1",
    dayAssignments: [{ event_id: "e1", date: "2099-03-12", status: "done" }],
    onChanged: () => {},
    fin: { contractValue: 1000, received: 400 },
    currency: "INR",
    hasDues: true,
    onToggleSettled: () => {},
    onOpenStorage: () => {},
  };
  it("renders without crashing, with and without the storage link", () => {
    const html = renderToString(h(EventActivityTab, props));
    expect(html).toContain("Automated Progress");
    expect(html).toContain("Schedule Progress");
    expect(() => renderToString(h(EventActivityTab, { ...props, onOpenStorage: undefined }))).not.toThrow();
  });
});
