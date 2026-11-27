// Your Plan → before any payment the app makes sure it's the newest version (checkAppVersion in hooks/usePWA.js).
import { describe, it, expect, vi, beforeEach } from "vitest";

function setup({ waitingAfterUpdate = false, installingForever = false, controller = true } = {}) {
  const posted = [];
  const reg = { waiting: null, installing: null };
  reg.update = vi.fn(async () => {
    if (waitingAfterUpdate) reg.waiting = { postMessage: (m) => posted.push(m) };
    if (installingForever) reg.installing = { state: "installing", addEventListener: () => {} };
  });
  globalThis.window = { location: { reload: vi.fn() }, addEventListener: () => {} };
  globalThis.sessionStorage = { store: {}, setItem(k, v) { this.store[k] = v; }, getItem(k) { return this.store[k] ?? null; }, removeItem(k) { delete this.store[k]; } };
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: { controller: controller ? {} : null, getRegistration: async () => reg, addEventListener: () => {} }, userAgent: "" } });
  return { reg, posted };
}

describe("latest app version before paying", () => {
  beforeEach(() => { vi.resetModules(); vi.useRealTimers(); });
  it("already the newest: go ahead", async () => {
    setup();
    const { checkAppVersion } = await import("../src/hooks/usePWA.js");
    expect(await checkAppVersion({ dev: false })).toBe("latest");
  });
  it("a newer version is ready: says so, and switches only when asked", async () => {
    const { posted } = setup({ waitingAfterUpdate: true });
    const { checkAppVersion, applyAppUpdateForPayment, UPDATED_FOR_PAYMENT_KEY } = await import("../src/hooks/usePWA.js");
    expect(await checkAppVersion({ dev: false })).toBe("update");
    expect(posted).toEqual([]); // nothing happens on its own
    await applyAppUpdateForPayment();
    expect(posted).toEqual([{ type: "SKIP_WAITING" }]);
    expect(sessionStorage.getItem(UPDATED_FOR_PAYMENT_KEY)).toBe("1");
  });
  it("still downloading the new version: not latest yet", async () => {
    setup({ installingForever: true });
    const { checkAppVersion } = await import("../src/hooks/usePWA.js");
    expect(await checkAppVersion({ dev: false })).toBe("downloading");
  });
  it("first visit (no older version running): go ahead", async () => {
    setup({ controller: false, waitingAfterUpdate: true });
    const { checkAppVersion } = await import("../src/hooks/usePWA.js");
    expect(await checkAppVersion({ dev: false })).toBe("latest");
  });
});
