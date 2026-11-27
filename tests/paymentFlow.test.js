// Runs the REAL edge-function handlers verifyPayment and handleRazorpayWebhook (and the shared payment engine) with an
// in-memory database and a fake Razorpay API, to prove: a paid payment switches Pro on and makes the receipt row; a
// failed / unpaid / forged one changes nothing; renewals keep their days; test keys are locked to the test workspace.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

const db = vi.hoisted(() => {
  const tables = {};
  const from = (table) => {
    const filters = [];
    let op = "select", payload, lim, one = false, maybe = false;
    const run = () => {
      const all = (tables[table] ||= []);
      let out;
      if (op === "insert") {
        // Like the real database: a user-id column only takes a uuid (or nothing). Tests can also force a failure.
        const rows = Array.isArray(payload) ? payload : [payload];
        const uuidCols = ["updated_by", "created_by_id"];
        const bad = rows.some((p) => uuidCols.some((c) => p[c] != null && !/^[0-9a-f-]{8,}$/i.test(String(p[c])) && !/^u\d+$/.test(String(p[c]))));
        if (bad || tables.__failInsert === table) return one || maybe ? { data: null, error: { message: "invalid input syntax for type uuid" } } : { data: null, error: { message: "insert failed" } };
        out = rows.map((p) => ({ id: `${table}_${all.length + 1}`, ...p }));
        all.push(...out);
      } else {
        out = all.filter((r) => filters.every((f) => f(r)));
        if (op === "update") out.forEach((r) => Object.assign(r, payload));
      }
      if (lim) out = out.slice(0, lim);
      if (one || maybe) return out.length ? { data: out[0], error: null } : { data: null, error: one ? { message: "no rows" } : null };
      return { data: out, error: null };
    };
    const api = {
      select: () => api, order: () => api,
      eq: (k, v) => (filters.push((r) => r[k] === v), api),
      neq: (k, v) => (filters.push((r) => r[k] !== v), api),
      gte: (k, v) => (filters.push((r) => r[k] != null && String(r[k]) >= String(v)), api),
      is: (k, v) => (filters.push((r) => (r[k] ?? null) === v), api),
      in: (k, vs) => (filters.push((r) => vs.includes(r[k])), api),
      limit: (n) => ((lim = n), api),
      single: () => ((one = true), api), maybeSingle: () => ((maybe = true), api),
      insert: (p) => ((op = "insert"), (payload = p), api),
      update: (p) => ((op = "update"), (payload = p), api),
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return api;
  };
  return { tables, supabaseAdmin: { from }, user: { current: null } };
});
vi.mock("../supabase/functions/_shared/supabaseClient.ts", () => ({
  supabaseAdmin: db.supabaseAdmin,
  getUserFromRequest: async () => db.user.current,
}));
// Billing emails: the real helper sends through SMTP / Resend (Deno only). Record the receipts instead.
const mail = vi.hoisted(() => ({ receipts: [], fail: false }));
vi.mock("../supabase/functions/_shared/billingEmail.ts", () => ({
  sendPaymentReceiptEmail: async (args) => { mail.receipts.push(args); if (mail.fail) throw new Error("mail server down"); return { sent: true }; },
}));

const ENV = { RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "test_secret", RAZORPAY_WEBHOOK_SECRET: "hook_secret", RAZORPAY_TEST_WORKSPACES: "ws1" };
let razorpayStatus = "captured";
// What the fake Razorpay says about a payment: by default exactly what the order asked for. Tests can change it.
let rzpOverride = {};
let currentOrder = "";
// Delay for the fake Razorpay call, so a race test can make the browser check wait while the webhook runs.
let fetchDelayMs = 0;
// Orders created at the fake Razorpay (what the server asked Razorpay to charge).
const ordersSent = [];
const handlers = [];
let verify, webhook, createOrder, computeExpiry;

beforeAll(async () => {
  globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => handlers.push(h) };
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url).endsWith("/v1/orders") && init?.method === "POST") {
      const sent = JSON.parse(init.body);
      ordersSent.push(sent);
      return new Response(JSON.stringify({ id: `order_new_${ordersSent.length}`, ...sent }), { status: 200 });
    }
    const id = String(url).split("/payments/")[1];
    if (fetchDelayMs) await new Promise((r) => setTimeout(r, fetchDelayMs));
    const row = (db.tables.subscription_payments || []).find((p) => p.gateway_order_id === currentOrder);
    const body = { id, status: razorpayStatus, order_id: currentOrder, amount: Math.round((row?.amount || 0) * 100), currency: row?.currency || "INR", ...rzpOverride };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  await import("../supabase/functions/verifyPayment/index.ts");
  verify = handlers[0];
  await import("../supabase/functions/handleRazorpayWebhook/index.ts");
  webhook = handlers[1];
  await import("../supabase/functions/createPaymentOrder/index.ts");
  createOrder = handlers[2];
  ({ computeExpiry } = await import("../supabase/functions/_shared/planEngine.ts"));
});

const today = () => new Date().toISOString().split("T")[0];
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
const sign = (secret, text) => crypto.createHmac("sha256", secret).update(text).digest("hex");

function seed({ activeSub } = {}) {
  for (const k of Object.keys(db.tables)) delete db.tables[k];
  Object.assign(db.tables, {
    workspaces: [
      { id: "ws1", owner_user_id: "u1", plan_type: activeSub ? "pro" : "free", plan_status: "active" },
      { id: "ws2", owner_user_id: "u2", plan_type: "free", plan_status: "active" },
    ],
    workspace_members: [],
    profiles: [{ id: "u1", role: "owner" }, { id: "u2", role: "owner" }],
    plans: [{ id: "plan_pro", code: "PRO" }],
    plan_pricings: [
      { id: "monthly", plan_id: "plan_pro", price: 499, currency: "INR", billing_cycle: "MONTHLY", duration_months: 1, is_active: true },
      { id: "yearly", plan_id: "plan_pro", price: 4999, currency: "INR", billing_cycle: "ANNUAL", duration_months: 12, is_active: true },
    ],
    subscription_payments: [
      { id: "pay_row_1", workspace_id: "ws1", pricing_id: activeSub ? "yearly" : "monthly", amount: activeSub ? 4999 : 499, currency: "INR", gateway: "razorpay", gateway_order_id: "order_1", status: "CREATED" },
      { id: "pay_row_2", workspace_id: "ws2", pricing_id: "monthly", amount: 499, currency: "INR", gateway: "razorpay", gateway_order_id: "order_2", status: "CREATED" },
    ],
    workspace_subscriptions: activeSub ? [{ id: "old_sub", workspace_id: "ws1", plan_id: "plan_pro", status: "ACTIVE", started_at: plusDays(-345), expires_at: activeSub }] : [],
  });
  db.user.current = { id: "u1" };
  razorpayStatus = "captured";
  rzpOverride = {};
  fetchDelayMs = 0;
}

async function callVerify(orderId, paymentId, signature) {
  currentOrder = orderId;
  const res = await verify(new Request("http://x/verifyPayment", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature ?? sign(ENV.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`) }),
  }));
  return { status: res.status, body: await res.json() };
}
async function callWebhook(event, entity, signature) {
  const row = db.tables.subscription_payments.find((p) => p.gateway_order_id === entity.order_id);
  entity = { amount: Math.round((row?.amount || 0) * 100), currency: "INR", ...entity };
  const raw = JSON.stringify({ event, payload: { payment: { entity } } });
  const res = await webhook(new Request("http://x/hook", { method: "POST", headers: { "x-razorpay-signature": signature ?? sign(ENV.RAZORPAY_WEBHOOK_SECRET, raw) }, body: raw }));
  return { status: res.status, body: await res.json() };
}
const row = (id) => db.tables.subscription_payments.find((p) => p.id === id);
const subsOf = (ws) => db.tables.workspace_subscriptions.filter((s) => s.workspace_id === ws);
const ws = (id) => db.tables.workspaces.find((w) => w.id === id);

describe("paid payment → Pro on, receipt row saved", () => {
  beforeEach(() => seed());
  it("captured + genuine signature activates Pro for the paid period", async () => {
    const r = await callVerify("order_1", "pay_ABC");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, activated: true });
    const sub = subsOf("ws1")[0];
    expect(sub).toMatchObject({ status: "ACTIVE", plan_id: "plan_pro", source: "PAYMENT_GATEWAY", started_at: today(), expires_at: computeExpiry(today(), 1) });
    expect(ws("ws1")).toMatchObject({ plan_type: "pro", plan_status: "active" });
    // The receipt in Your Plan → Payment History is this row.
    expect(row("pay_row_1")).toMatchObject({ status: "SUCCESS", gateway_payment_id: "pay_ABC", subscription_id: sub.id });
    expect(row("pay_row_1").verified_at).toBeTruthy();
  });
  it("the same payment sent twice never makes a second subscription", async () => {
    await callVerify("order_1", "pay_ABC");
    const again = await callVerify("order_1", "pay_ABC");
    expect(again.body).toMatchObject({ ok: true, alreadyVerified: true });
    expect(subsOf("ws1")).toHaveLength(1);
  });
});

describe("failed / unpaid / forged → nothing switched on", () => {
  beforeEach(() => seed());
  it("Razorpay says failed: payment FAILED, workspace stays Free", async () => {
    razorpayStatus = "failed";
    const r = await callVerify("order_1", "pay_ABC");
    expect(r.status).toBe(400);
    expect(row("pay_row_1")).toMatchObject({ status: "FAILED", failure_reason: "Razorpay status: failed" });
    expect(subsOf("ws1")).toHaveLength(0);
    expect(ws("ws1").plan_type).toBe("free");
  });
  it("only authorized (not captured): not switched on", async () => {
    razorpayStatus = "authorized";
    const r = await callVerify("order_1", "pay_ABC");
    expect(r.body.ok).toBe(false);
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("forged signature: refused before anything is read or written", async () => {
    const r = await callVerify("order_1", "pay_ABC", "f".repeat(64));
    expect(r.status).toBe(500);
    expect(r.body.error).toMatch(/signature verification failed/);
    expect(row("pay_row_1").status).toBe("CREATED");
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("someone else's order: refused", async () => {
    db.user.current = { id: "u2" };
    const r = await callVerify("order_1", "pay_ABC");
    expect(r.status).toBe(403);
    expect(subsOf("ws1")).toHaveLength(0);
  });
});

describe("test keys are locked to the test workspace", () => {
  beforeEach(() => seed());
  it("a workspace not on the test list can't activate with test keys", async () => {
    db.user.current = { id: "u2" };
    const r = await callVerify("order_2", "pay_XYZ");
    expect(r.status).toBe(503);
    expect(subsOf("ws2")).toHaveLength(0);
    expect(row("pay_row_2").status).toBe("CREATED");
  });
  it("a platform admin can test from any workspace", async () => {
    db.tables.profiles.find((p) => p.id === "u2").role = "admin";
    db.user.current = { id: "u2" };
    const r = await callVerify("order_2", "pay_XYZ");
    expect(r.body).toMatchObject({ ok: true, activated: true });
  });
});

describe("a Pro period that can't be saved never leaves the workspace half-switched", () => {
  it("saves with an empty 'updated by' (a text there made the real database refuse the row)", async () => {
    seed();
    const r = await callVerify("order_1", "pay_ABC");
    expect(r.body).toMatchObject({ ok: true, activated: true });
    const sub = subsOf("ws1")[0];
    expect(sub.updated_by ?? null).toBeNull();
    expect(sub.created_by_id).toBe("u1"); // the workspace owner
  });
  it("if saving fails: the old plan stays active and the payment goes back for a retry", async () => {
    seed({ activeSub: plusDays(20) });
    db.tables.__failInsert = "workspace_subscriptions";
    const r = await callVerify("order_1", "pay_FAIL");
    expect(r.body.ok).not.toBe(true);
    expect(subsOf("ws1").find((s) => s.id === "old_sub").status).toBe("ACTIVE");
    expect(row("pay_row_1").status).toBe("CREATED");
    delete db.tables.__failInsert;
  });
  it("a suspended workspace stays suspended after a payment", async () => {
    seed();
    ws("ws1").plan_status = "suspended";
    await callVerify("order_1", "pay_SUS");
    expect(ws("ws1").plan_status).toBe("suspended");
  });
});

describe("renewal keeps the days left", () => {
  it("20 days left + 1 year = new end date one year after the current end", async () => {
    const currentEnd = plusDays(20);
    seed({ activeSub: currentEnd });
    const r = await callVerify("order_1", "pay_REN");
    expect(r.body.activated).toBe(true);
    const active = subsOf("ws1").filter((s) => s.status === "ACTIVE");
    expect(active).toHaveLength(1);
    expect(active[0].expires_at).toBe(computeExpiry(currentEnd, 12));
    expect(subsOf("ws1").find((s) => s.id === "old_sub").status).toBe("CANCELLED");
  });
});

describe("webhook (backup when the browser closes mid-payment)", () => {
  beforeEach(() => seed());
  it("payment.captured switches Pro on", async () => {
    const r = await callWebhook("payment.captured", { id: "pay_W", order_id: "order_1" });
    expect(r.body).toMatchObject({ ok: true, activated: true });
    expect(row("pay_row_1")).toMatchObject({ status: "SUCCESS", gateway_payment_id: "pay_W" });
    expect(ws("ws1").plan_type).toBe("pro");
  });
  it("payment.failed marks it FAILED with the reason, nothing switched on", async () => {
    const r = await callWebhook("payment.failed", { id: "pay_F", order_id: "order_1", error_description: "Payment declined by bank" });
    expect(r.body).toMatchObject({ ok: true, marked: "failed" });
    expect(row("pay_row_1")).toMatchObject({ status: "FAILED", failure_reason: "Payment declined by bank" });
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("a late payment.failed never undoes a payment that succeeded", async () => {
    await callVerify("order_1", "pay_ABC");
    const r = await callWebhook("payment.failed", { id: "pay_F", order_id: "order_1" });
    expect(r.body).toMatchObject({ alreadyProcessed: true });
    expect(row("pay_row_1").status).toBe("SUCCESS");
  });
  it("browser verify + webhook for the same payment: still one subscription", async () => {
    await callVerify("order_1", "pay_ABC");
    await callWebhook("payment.captured", { id: "pay_ABC", order_id: "order_1" });
    expect(subsOf("ws1")).toHaveLength(1);
  });
  it("a webhook with a wrong signature is refused", async () => {
    const r = await callWebhook("payment.captured", { id: "pay_W", order_id: "order_1" }, "0".repeat(64));
    expect(r.status).toBe(500);
    expect(row("pay_row_1").status).toBe("CREATED");
  });
});

describe("the money must match, and one payment pays once", () => {
  beforeEach(() => seed());
  it("captured amount lower than the plan price: refused and marked FAILED", async () => {
    rzpOverride = { amount: 100 };
    const r = await callVerify("order_1", "pay_LOW");
    expect(r.status).toBe(400);
    expect(row("pay_row_1").status).toBe("FAILED");
    expect(row("pay_row_1").failure_reason).toMatch(/Amount mismatch/);
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("wrong currency: refused", async () => {
    rzpOverride = { currency: "USD" };
    const r = await callVerify("order_1", "pay_USD");
    expect(r.status).toBe(400);
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("a payment from a different order: refused", async () => {
    rzpOverride = { order_id: "order_OTHER" };
    const r = await callVerify("order_1", "pay_X");
    expect(r.status).toBe(400);
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("one Razorpay payment cannot pay for a second row", async () => {
    await callVerify("order_1", "pay_ONCE");
    db.tables.subscription_payments.push({ id: "pay_row_3", workspace_id: "ws1", pricing_id: "monthly", amount: 499, currency: "INR", gateway: "razorpay", gateway_order_id: "order_3", status: "CREATED" });
    const again = await callVerify("order_3", "pay_ONCE", sign(ENV.RAZORPAY_KEY_SECRET, "order_3|pay_ONCE"));
    expect(again.status).toBe(409);
    expect(subsOf("ws1").filter((x) => x.status === "ACTIVE")).toHaveLength(1);
  });
  it("browser check and webhook at the same moment: one Pro period, not two", async () => {
    // Both read the payment as not-yet-paid: the browser check then waits on Razorpay while the webhook activates.
    currentOrder = "order_1";
    fetchDelayMs = 30;
    await Promise.all([
      callVerify("order_1", "pay_RACE"),
      callWebhook("payment.captured", { id: "pay_RACE", order_id: "order_1" }),
    ]);
    const subs = subsOf("ws1");
    expect(subs).toHaveLength(1);
    expect(subs[0].expires_at).toBe(computeExpiry(today(), 1));
  });
  it("two activations holding the same not-yet-paid payment: only the first one counts", async () => {
    // The real race: the browser check and the webhook each read the payment as CREATED, then both try to activate.
    const { activateProFromPayment } = await import("../supabase/functions/_shared/paymentEngine.ts");
    const stale = { ...row("pay_row_1"), gateway_payment_id: "pay_TWICE" };
    const pricing = db.tables.plan_pricings.find((p) => p.id === "monthly");
    const proPlan = db.tables.plans[0];
    mail.receipts.length = 0;
    const results = await Promise.all([activateProFromPayment({ ...stale }, pricing, proPlan), activateProFromPayment({ ...stale }, pricing, proPlan)]);
    expect(results.filter((r) => r.alreadyActivated)).toHaveLength(1);
    // One payment, one receipt email, for the paid period.
    expect(mail.receipts).toHaveLength(1);
    expect(mail.receipts[0]).toMatchObject({ workspaceId: "ws1", paymentId: "pay_TWICE", expiresAt: computeExpiry(today(), 1) });
    const active = subsOf("ws1").filter((x) => x.status === "ACTIVE");
    expect(active).toHaveLength(1);
    expect(active[0].expires_at).toBe(computeExpiry(today(), 1));
  });
  it("a failing receipt email never undoes the payment (no second Pro period on retry)", async () => {
    const { activateProFromPayment } = await import("../supabase/functions/_shared/paymentEngine.ts");
    const pay = { ...row("pay_row_1"), gateway_payment_id: "pay_MAILFAIL" };
    const pricing = db.tables.plan_pricings.find((p) => p.id === "monthly");
    mail.fail = true;
    try {
      const r = await activateProFromPayment({ ...pay }, pricing, db.tables.plans[0]);
      expect(r.ok).toBe(true);
    } finally { mail.fail = false; }
    expect(row("pay_row_1").status).toBe("SUCCESS"); // not put back to CREATED
    const again = await activateProFromPayment({ ...pay }, pricing, db.tables.plans[0]); // e.g. the webhook retrying
    expect(again.alreadyActivated).toBe(true);
    expect(subsOf("ws1").filter((x) => x.status === "ACTIVE")).toHaveLength(1);
    // The receipt shows what was charged on the order, not today's price.
    expect(mail.receipts.at(-1).amount).toBe(Number(pay.amount));
  });
  it("webhook with a wrong amount: marked FAILED, nothing switched on", async () => {
    const r = await callWebhook("payment.captured", { id: "pay_W", order_id: "order_1", amount: 1 });
    expect(r.body).toMatchObject({ marked: "failed" });
    expect(subsOf("ws1")).toHaveLength(0);
  });
  it("webhook respects the test-key lock", async () => {
    const r = await callWebhook("payment.captured", { id: "pay_W2", order_id: "order_2" });
    expect(r.body.ignored).toBeTruthy();
    expect(subsOf("ws2")).toHaveLength(0);
  });
});

describe("plans have fixed prices", () => {
  beforeEach(() => { seed(); ordersSent.length = 0; });
  async function callCreate(body) {
    const res = await createOrder(new Request("http://x/createPaymentOrder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  }
  it("an amount sent by the app is ignored: Razorpay is asked for the plan's fixed price", async () => {
    const r = await callCreate({ workspace_id: "ws1", pricing_id: "monthly", amount: 1, price: 1, currency: "USD", discount: 99 });
    expect(r.status).toBe(200);
    expect(ordersSent[0]).toMatchObject({ amount: 49900, currency: "INR" });
    const saved = db.tables.subscription_payments.find((p) => p.gateway_order_id === r.body.order_id);
    expect(saved).toMatchObject({ amount: 499, currency: "INR", pricing_id: "monthly", status: "CREATED" });
  });
  it("the yearly option is charged at its own fixed price", async () => {
    await callCreate({ workspace_id: "ws1", pricing_id: "yearly", amount: 499 });
    expect(ordersSent[0].amount).toBe(499900);
  });
  it("an inactive, zero-price or non-Pro option can't be bought", async () => {
    db.tables.plan_pricings.push({ id: "off", plan_id: "plan_pro", price: 99, currency: "INR", billing_cycle: "MONTHLY", duration_months: 1, is_active: false });
    db.tables.plan_pricings.push({ id: "zero", plan_id: "plan_pro", price: 0, currency: "INR", billing_cycle: "MONTHLY", duration_months: 1, is_active: true });
    db.tables.plan_pricings.push({ id: "free", plan_id: "plan_free", price: 10, currency: "INR", billing_cycle: "MONTHLY", duration_months: 1, is_active: true });
    for (const id of ["off", "zero", "free"]) expect((await callCreate({ workspace_id: "ws1", pricing_id: id })).status).toBe(400);
    expect(ordersSent).toHaveLength(0);
  });
  it("paid Pro with more than 30 days left: renewal not open yet, no order is made", async () => {
    const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    db.tables.workspace_subscriptions.push({ id: "s_far", workspace_id: "ws1", plan_id: "plan_pro", status: "ACTIVE", source: "PAYMENT_GATEWAY", started_at: day(-10), expires_at: day(120) });
    const r = await callCreate({ workspace_id: "ws1", pricing_id: "monthly" });
    expect(r.status).toBe(409);
    expect(r.body.renewal_opens_on).toBe(day(90));
    expect(r.body.error).toMatch(/You can renew from/);
    expect(ordersSent).toHaveLength(0);
    // The gateway check the page makes on open still says payments are on.
    expect((await callCreate({ workspace_id: "ws1", pricing_id: "monthly", check_only: true })).body.configured).toBe(true);
  });
  it("within the last 30 days, or Pro given by an admin, renewal is allowed", async () => {
    const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    db.tables.workspace_subscriptions.push({ id: "s_near", workspace_id: "ws1", plan_id: "plan_pro", status: "ACTIVE", source: "PAYMENT_GATEWAY", started_at: day(-150), expires_at: day(20) });
    db.tables.workspace_subscriptions.push({ id: "s_admin", workspace_id: "ws1", plan_id: "plan_pro", status: "ACTIVE", source: "ADMIN", started_at: day(-1), expires_at: day(300) });
    expect((await callCreate({ workspace_id: "ws1", pricing_id: "monthly" })).status).toBe(200);
  });
  it("paying less than the fixed price never switches Pro on", async () => {
    const r = await callCreate({ workspace_id: "ws1", pricing_id: "monthly" });
    rzpOverride = { amount: 100 };
    const v = await callVerify(r.body.order_id, "pay_CHEAP");
    expect(v.status).toBe(400);
    expect(subsOf("ws1")).toHaveLength(0);
  });
});
