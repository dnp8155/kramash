// Turns a checked data file (see dataFile.js) into real Kramasha records. Planning is separate from saving, so the
// screen can show exactly what will be created and what will be skipped before anything is written.

import { base44 } from "@/api/base44Client";
import { fyForDate, todayISO } from "@/lib/dates";
import { resolveFYForDate, fyContaining, validateFYRange, createNextFY } from "@/lib/financialYearService";

const lower = (s) => String(s || "").trim().toLowerCase();
const payKey = (eventId, date, kind, amount) => `${eventId || ""}|${date}|${kind}|${Number(amount)}`;
const kindOfTx = (t) => (t.transaction_type === "CLIENT_RECEIPT" ? "received" : "paid");

export async function loadExisting(workspaceId) {
  const [clients, events, transactions] = await Promise.all([
    base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 10000),
    base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 10000),
    base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId }, "-transaction_date", 20000),
  ]);
  return { clients: clients || [], events: events || [], transactions: transactions || [] };
}

// What would happen if this file were imported now. Anything already in the workspace is left alone, so the same
// file can be imported twice without doubling anything.
export function planImport(data, existing, fiscalYears) {
  const clientIdByName = new Map(existing.clients.map((c) => [lower(c.name), c.id]));
  const clientNameById = new Map(existing.clients.map((c) => [c.id, c.name]));
  const eventIdByKey = new Map(existing.events.map((e) => [`${lower(clientNameById.get(e.client_id))}|${lower(e.title)}|${String(e.start_date).slice(0, 10)}`, e.id]));

  // How many of each payment the workspace already holds, so a repeat is skipped but a genuine second payment of
  // the same amount on the same day is still added.
  const held = new Map();
  for (const t of existing.transactions) {
    if (t.status === "VOID") continue;
    const k = payKey(t.event_id, String(t.transaction_date).slice(0, 10), kindOfTx(t), t.amount);
    held.set(k, (held.get(k) || 0) + 1);
  }
  const place = (eventId, p, isNewEvent = false) => {
    // A brand-new event has no payments yet, so nothing can already exist for it.
    if (isNewEvent) return null;
    const k = payKey(eventId, p.date, p.kind, p.amount);
    const n = held.get(k) || 0;
    if (n > 0) { held.set(k, n - 1); return "exists"; }
    return null;
  };

  const newClients = data.clients.filter((c) => !clientIdByName.has(lower(c.name)));
  const events = data.events.map((e) => {
    const start = e.dates[0];
    const eventId = eventIdByKey.get(`${lower(e.client)}|${lower(e.title)}|${start}`) || null;
    return { rec: e, existingId: eventId, payments: e.payments.map((p) => ({ rec: p, skip: place(eventId, p, !eventId) })) };
  });
  const misc = data.misc.map((p) => ({ rec: p, skip: place(null, p) }));

  const all = [...events.flatMap((e) => e.payments), ...misc];
  // Payments dated in a year the workspace has no financial year for: the import creates those years.
  const missingYears = [...new Set(all.filter((p) => !p.skip && !resolveFYForDate(p.rec.date, fiscalYears)).map((p) => fyContaining(p.rec.date)?.label).filter(Boolean))].sort();
  return {
    newClients,
    events,
    misc,
    missingYears,
    counts: {
      clients: newClients.length,
      events: events.filter((e) => !e.existingId).length,
      eventsExisting: events.filter((e) => e.existingId).length,
      payments: all.filter((p) => !p.skip).length,
      paymentsExisting: all.filter((p) => p.skip === "exists").length,
      yearsToCreate: missingYears.length,
    },
  };
}

const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

// The database does not enforce plan caps, only the app screens do, so the import has to respect them itself:
// `maxNewEvents` is how many more events the plan allows (Infinity when unlimited).
export async function runImport(plan, { workspaceId, fiscalYears, existing, maxNewEvents = Infinity, onProgress = () => {} }) {
  const result = { clients: 0, events: 0, payments: 0, yearsCreated: [], skippedNoFy: 0, failed: [], stoppedByLimit: false };
  const clientId = new Map(existing.clients.map((c) => [lower(c.name), c.id]));

  // Make any financial year that a payment needs and the workspace does not have yet (never set as the active year).
  const fys = [...fiscalYears];
  const wanted = new Map();
  for (const p of [...plan.events.flatMap((e) => e.payments), ...plan.misc]) {
    if (p.skip || resolveFYForDate(p.rec.date, fys)) continue;
    const c = fyContaining(p.rec.date);
    if (c) wanted.set(c.fyId, c);
  }
  for (const c of [...wanted.values()].sort((a, b) => a.start.localeCompare(b.start))) {
    try {
      const ok = await validateFYRange(workspaceId, c.start, c.end);
      if (!ok.valid) { result.failed.push(`Financial year ${c.label} could not be created: ${ok.error}`); continue; }
      fys.push(await createNextFY(workspaceId, c, false));
      result.yearsCreated.push(c.label);
    } catch (e) {
      result.failed.push(`Financial year ${c.label} could not be created: ${e?.message || "unknown error"}`);
    }
  }

  const totalSteps = plan.newClients.length + plan.counts.events + plan.counts.payments;
  let done = 0;
  const tick = (label) => onProgress(label, ++done, totalSteps);

  for (const c of plan.newClients) {
    try {
      const saved = await base44.entities.Client.create({
        workspace_id: workspaceId, name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, notes: c.notes,
      });
      clientId.set(lower(c.name), saved.id);
      result.clients++;
    } catch (e) {
      result.failed.push(`Client "${c.name}": ${e?.message || "could not be saved"}`);
    }
    tick(`Clients — ${c.name}`);
  }

  const today = todayISO();
  const txRows = [];
  for (const ev of plan.events) {
    const e = ev.rec;
    let eventId = ev.existingId;
    const cid = clientId.get(lower(e.client));
    if (!eventId) {
      if (result.stoppedByLimit) continue;
      if (result.events >= maxNewEvents) {
        result.stoppedByLimit = true;
        result.failed.push(`Event "${e.title}" and the events after it were not added because your plan allows ${maxNewEvents} more. Upgrade to Pro to add the rest, then import the same file again.`);
        continue;
      }
      if (!cid) { result.failed.push(`Event "${e.title}": its client "${e.client}" could not be created.`); continue; }
      try {
        const last = e.dates[e.dates.length - 1];
        const saved = await base44.entities.Event.create({
          workspace_id: workspaceId, client_id: cid, title: e.title, event_type: e.type,
          start_date: e.dates[0], end_date: last, event_dates: e.dates, financial_year: fyForDate(e.dates[0]) || "",
          team_member_ids: [], service_ids: [], venue: e.venue, venue_address: "",
          status: e.status || (last < today ? "completed" : "upcoming"),
          contract_value: e.contract_value, description: "", notes: e.notes,
        });
        eventId = saved.id;
        result.events++;
      } catch (err) {
        const data = err?.data || err;
        if (data?.error === "PLAN_LIMIT_REACHED") {
          result.stoppedByLimit = true;
          result.failed.push(`Event "${e.title}": your plan's limit of ${data.limit} was reached, so this and the events after it were not added.`);
        } else result.failed.push(`Event "${e.title}": ${err?.message || "could not be saved"}`);
        continue;
      } finally {
        tick(`Events — ${e.title}`);
      }
    }
    for (const p of ev.payments) {
      if (p.skip) continue;
      const fy = resolveFYForDate(p.rec.date, fys);
    if (!fy) { result.skippedNoFy++; continue; }
      txRows.push(p.rec.kind === "received"
        ? { workspace_id: workspaceId, financial_year_id: fy.id, event_id: eventId, client_id: cid || null, transaction_type: "CLIENT_RECEIPT", amount: p.rec.amount, payment_method: p.rec.method, transaction_date: p.rec.date, reference_number: "", notes: p.rec.note, status: "ACTIVE" }
        : { workspace_id: workspaceId, financial_year_id: fy.id, event_id: eventId, transaction_type: "BUSINESS_EXPENSE", expense_category_id: null, expense_category_name_snapshot: p.rec.note || "Expense", amount: p.rec.amount, payment_method: p.rec.method, transaction_date: p.rec.date, reference_number: "", notes: "", status: "ACTIVE" });
    }
  }
  for (const p of plan.misc) {
    if (p.skip) continue;
    const fy = resolveFYForDate(p.rec.date, fys);
      if (!fy) { result.skippedNoFy++; continue; }
    txRows.push({
      workspace_id: workspaceId, financial_year_id: fy.id, event_id: null,
      transaction_type: p.rec.kind === "received" ? "CLIENT_RECEIPT" : "BUSINESS_EXPENSE",
      expense_category_id: null, expense_category_name_snapshot: p.rec.category,
      amount: p.rec.amount, payment_method: p.rec.method, transaction_date: p.rec.date, reference_number: "", notes: "", status: "ACTIVE",
    });
  }

  for (const rows of chunk(txRows, 50)) {
    try {
      await base44.entities.FinancialTransaction.bulkCreate(rows);
      result.payments += rows.length;
    } catch (e) {
      result.failed.push(`${rows.length} payments (${rows[0].transaction_date} onwards): ${e?.message || "could not be saved"}`);
    }
    done += rows.length;
    onProgress("Payments", Math.min(done, totalSteps), totalSteps);
  }
  return result;
}
