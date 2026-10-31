import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { leaveForOAuth, jumpBackAfterOAuth, takeOAuthResult } from "@/lib/oauthReturn";

// A tiny stand-in for the browser: a history length we control, the current address, and session storage.
function setup({ length = 8, pathname = "/my-profile", search = "" } = {}) {
  const store = new Map();
  const win = { history: { length, go: vi.fn() }, location: { pathname, search, href: "" } };
  vi.stubGlobal("window", win);
  vi.stubGlobal("sessionStorage", { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) });
  return win;
}

describe("coming back from a sign-in page", () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("jumps back over the sign-in pages to the page it left, and hands over the result once", () => {
    const win = setup({ length: 8 });
    leaveForOAuth("https://www.facebook.com/dialog/oauth?x=1");
    expect(win.location.href).toContain("facebook.com");
    // Two sign-in pages and the page we came back to were added.
    win.history.length = 11;
    win.location.search = "?instagram=connected";
    expect(jumpBackAfterOAuth()).toBe(true);
    expect(win.history.go).toHaveBeenCalledWith(-3);
    expect(takeOAuthResult("instagram")).toBe("?instagram=connected");
    expect(takeOAuthResult("instagram")).toBeNull(); // only once
  });

  it("does nothing when the person did not leave from this app", () => {
    const win = setup();
    win.location.search = "?instagram=connected";
    expect(jumpBackAfterOAuth()).toBe(false);
    expect(win.history.go).not.toHaveBeenCalled();
  });

  it("does not jump when they come back to a different page than they left", () => {
    const win = setup({ pathname: "/preferences" });
    leaveForOAuth("https://accounts.google.com/x");
    win.history.length += 2;
    win.location.pathname = "/my-profile";
    expect(jumpBackAfterOAuth()).toBe(false);
    expect(win.history.go).not.toHaveBeenCalled();
  });

  it("does not jump when the history count makes no sense (a capped history, or nothing added)", () => {
    const win = setup({ length: 50 });
    leaveForOAuth("https://www.facebook.com/x");
    expect(jumpBackAfterOAuth()).toBe(false); // length did not grow
    leaveForOAuth("https://www.facebook.com/x");
    win.history.length = 50 + 40; // far too many
    expect(jumpBackAfterOAuth()).toBe(false);
    expect(win.history.go).not.toHaveBeenCalled();
  });

  it("ignores a sign-in that was left open for a long time", () => {
    const win = setup();
    leaveForOAuth("https://www.facebook.com/x");
    win.history.length += 3;
    vi.setSystemTime(1_000_000 + 31 * 60 * 1000);
    expect(jumpBackAfterOAuth()).toBe(false);
  });

  it("keeps a result for the other service until that service asks for it", () => {
    const win = setup();
    leaveForOAuth("https://accounts.google.com/x");
    win.history.length += 2;
    win.location.search = "?gmail=connected";
    jumpBackAfterOAuth();
    expect(takeOAuthResult("instagram")).toBeNull();
    expect(takeOAuthResult("gmail")).toBe("?gmail=connected");
  });

  it("drops a result nobody picked up within two minutes", () => {
    const win = setup();
    leaveForOAuth("https://www.facebook.com/x");
    win.history.length += 2;
    win.location.search = "?instagram=denied";
    jumpBackAfterOAuth();
    vi.setSystemTime(1_000_000 + 3 * 60 * 1000);
    expect(takeOAuthResult("instagram")).toBeNull();
  });
});
