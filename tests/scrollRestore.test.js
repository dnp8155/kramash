import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rememberScroll, getSavedScroll, restoreScroll, isRestoringScroll, guardTopOnArrival } from "@/lib/scrollRestore";

// Minimal DOM stand-ins: an event target for `document` and a scroll pane that records scrollTo calls.
function makeTarget() {
  const handlers = {};
  return {
    handlers,
    addEventListener: (type, fn) => { (handlers[type] ||= new Set()).add(fn); },
    removeEventListener: (type, fn) => { handlers[type]?.delete(fn); },
    fire: (type) => (handlers[type] ? [...handlers[type]] : []).forEach((fn) => fn()),
    count: (type) => handlers[type]?.size || 0,
  };
}
function makePane() {
  const pane = makeTarget();
  pane.scrollTop = 0;
  pane.scrollTo = vi.fn(({ top }) => { pane.scrollTop = top; });
  return pane;
}

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.document = makeTarget();
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.document;
});

describe("remembering scroll positions", () => {
  it("stores and returns the position per history entry", () => {
    rememberScroll("a", 420);
    rememberScroll("b", 0);
    expect(getSavedScroll("a")).toBe(420);
    expect(getSavedScroll("b")).toBe(0);
    expect(getSavedScroll("never-seen")).toBeUndefined();
  });
});

describe("guardTopOnArrival", () => {
  it("undoes a tiny unintended scroll right after a page opens", () => {
    const main = makePane();
    guardTopOnArrival(main);
    main.scrollTop = 6;
    main.fire("scroll");
    expect(main.scrollTop).toBe(0);
  });

  it("leaves bigger, deliberate scrolls alone", () => {
    const main = makePane();
    guardTopOnArrival(main);
    main.scrollTop = 600;
    main.fire("scroll");
    expect(main.scrollTo).not.toHaveBeenCalled();
  });

  it("stops guarding as soon as the person interacts", () => {
    const main = makePane();
    guardTopOnArrival(main);
    document.fire("touchstart");
    main.scrollTop = 12;
    main.fire("scroll");
    expect(main.scrollTo).not.toHaveBeenCalled();
  });

  it("cleans up its listeners after the window ends", () => {
    const main = makePane();
    guardTopOnArrival(main);
    expect(main.count("scroll")).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(main.count("scroll")).toBe(0);
    expect(document.count("touchstart")).toBe(0);
  });
});

describe("restoreScroll (Back / forward)", () => {
  it("keeps nudging until the page is tall enough, then stops", () => {
    const main = makePane();
    // The page is still loading: it can only scroll to 100 for now.
    main.scrollTo = vi.fn(({ top }) => { main.scrollTop = Math.min(top, main.maxTop ?? 100); });
    restoreScroll(main, 500);
    expect(isRestoringScroll()).toBe(true);
    expect(main.scrollTop).toBe(100);
    main.maxTop = 2000; // content arrived
    vi.advanceTimersByTime(40);
    expect(main.scrollTop).toBe(500);
    vi.advanceTimersByTime(2000);
    expect(isRestoringScroll()).toBe(false);
  });

  it("gives up the moment the person scrolls themselves", () => {
    const main = makePane();
    restoreScroll(main, 500);
    document.fire("wheel");
    expect(isRestoringScroll()).toBe(false);
    main.scrollTop = 40;
    vi.advanceTimersByTime(100);
    expect(main.scrollTop).toBe(40);
  });
});
