import { describe, it, expect, vi } from "vitest";

vi.hoisted(() => { globalThis.window = globalThis; });
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import Collapse from "@/components/common/Collapse";

describe("Collapse", () => {
  it("builds nothing while closed, so a closed card costs nothing", () => {
    expect(renderToString(h(Collapse, { open: false }, h("p", null, "details")))).toBe("");
  });
  it("starts open when asked to (a section that is open on load), with its content in place", () => {
    const html = renderToString(h(Collapse, { open: true }, h("p", null, "details")));
    expect(html).toContain("details");
    expect(html).toContain("grid-rows-[1fr]");
  });
});
