import { withCors } from "../_shared/cors.ts";
// runMessageAutomation — runs from generateNotifications' cron (every 30 min). Two jobs:
//   1. Automatic rules (Preferences → Business → Connections → Automation): payment due, event coming up,
//      thank you, anniversary. Email goes out by itself from the workspace's Gmail; WhatsApp can't be
//      automatic, so it becomes a notification ("Send payment reminder on WhatsApp") to the owner.
//   2. Scheduled messages (someone picked "Send later" in the Send message sheet).
// Every message carries a dedupe key, so running twice, or catching up after a missed run, never sends twice.
// Emailing is Pro only; WhatsApp reminders are free.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { safeJson } from "../_shared/helpers.ts";
import { getGmailAccount, isProWorkspace, sendClientEmailNow } from "../_shared/clientEmail.ts";
import { buildValues, renderTemplate } from "../_shared/messageRender.ts";
import { sendPushToUser } from "../_shared/sendPush.ts";

function isCronRequest(req: Request) {
  const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  if (serviceKey && bearer === serviceKey) return true;
  return !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
}

// "Today" and the time of day in a workspace's own timezone (Preferences → Profile & Workspace), falling back to India time
// if the saved zone is missing or not recognised.
function nowIn(tz: string | null | undefined, at = new Date()) {
  const read = (zone: string) => {
    const o: Record<string, string> = {};
    for (const p of new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at)) o[p.type] = p.value;
    return { todayISO: `${o.year}-${o.month}-${o.day}`, nowMinutes: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  };
  try { return read(tz || "Asia/Kolkata"); } catch { return read("Asia/Kolkata"); }
}

const day = 86400000;
const diffDays = (fromISO: string, toISO: string) => Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / day);
const addDaysISO = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * day).toISOString().split("T")[0];
const lastDateOf = (e: any): string => {
  const dates = (Array.isArray(e.event_dates) ? e.event_dates : []).map((d: string) => String(d).slice(0, 10)).sort();
  return dates.length ? dates[dates.length - 1] : String(e.end_date || e.start_date).slice(0, 10);
};

const RULE_LABEL: Record<string, string> = {
  payment_due: "payment reminder",
  event_upcoming: "reminder",
  thank_you: "thank-you message",
  anniversary: "anniversary wish",
};

// What the client owes on an event, worked out the same way as the app (contract + add-ons + extras − received).
async function moneyFor(workspaceId: string, event: any) {
  const [{ data: rec }, { data: addons }] = await Promise.all([
    supabaseAdmin.from("financial_transactions").select("amount").eq("workspace_id", workspaceId).eq("event_id", event.id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE"),
    supabaseAdmin.from("event_service_assignments").select("agreed_rate, assignment_status").eq("workspace_id", workspaceId).eq("event_id", event.id).eq("is_addon", true),
  ]);
  const received = (rec || []).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
  const addonTotal = (addons || []).filter((a: any) => a.assignment_status !== "removed").reduce((s: number, a: any) => s + (Number(a.agreed_rate) || 0), 0);
  let misc = 0;
  const arr = safeJson<any[]>(event.misc_expenses_json);
  if (Array.isArray(arr)) misc = arr.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const total = (Number(event.contract_value) || 0) + addonTotal + misc;
  return { total, paid: received, pending: Math.max(0, total - received) };
}

interface Counters { emailed: number; whatsapp: number; skipped: number; failed: number }

// WhatsApp can't be sent for the studio, so it becomes a notification they tap to open the Send message sheet.
// The finished text is saved with it (message_log, status "ready") so the event's Activity tab shows the message
// itself, ready to send, instead of only a notification.
async function notifyWhatsApp(ws: any, pro: boolean, c: { client: any; event: any; label: string; key: string; body?: string; templateName?: string; rule?: string }, counters: Counters) {
  if (!ws.owner_user_id || !c.client?.phone) { counters.skipped++; return; }
  // Closed by the studio (Activity → X): its message_log row stays, so they are not notified again.
  const { data: seen } = await supabaseAdmin.from("message_log").select("id").eq("workspace_id", ws.id).eq("dedupe_key", `wa:${c.key}`).limit(1);
  if ((seen || []).length) { counters.skipped++; return; }
  const title = `Send ${c.label} on WhatsApp`;
  const message = `${c.client.name}${c.event?.title ? ` · ${c.event.title}` : ""}`;
  const { data, error } = await supabaseAdmin.from("notifications").upsert({
    workspace_id: ws.id, user_id: ws.owner_user_id, type: "general", title, message,
    related_entity_type: c.event ? "event" : null, related_entity_id: c.event?.id || null, read: false, dedupe_key: `wa:${c.key}`,
  }, { onConflict: "workspace_id,user_id,dedupe_key", ignoreDuplicates: true }).select("id");
  if (error || !(data || []).length) { counters.skipped++; return; }
  counters.whatsapp++;
  if (c.body) {
    try {
      await supabaseAdmin.from("message_log").insert({
        workspace_id: ws.id, event_id: c.event?.id || null, client_id: c.client.id, channel: "whatsapp",
        template_name: c.templateName || c.label, recipient: c.client.phone, body: c.body, status: "ready",
        automated: true, rule_key: c.rule || "scheduled", dedupe_key: `wa:${c.key}`, created_by_id: ws.owner_user_id,
      });
    } catch { /* the notification still reaches the owner */ }
  }
  if (pro && c.event) {
    try { await sendPushToUser(ws.owner_user_id, title, message, { entity_type: "event", entity_id: c.event.id, url: `/events/${c.event.id}?tab=Activity` }, `wa:${c.key}`, ws.id); } catch { /* push is best-effort */ }
  }
}

async function emailCandidate(ws: any, account: any, o: { rule: string; cfg: any; client: any; event: any; values: Record<string, string>; key: string; createdBy: string; templateName: string }, counters: Counters) {
  const subject = renderTemplate(o.cfg.subject, o.values);
  const body = renderTemplate(o.cfg.body, o.values);
  const missing = [...new Set([...subject.missing, ...body.missing])];
  if (missing.length) {
    // Never email a literal "{venue}". Record it once so the studio can see why nothing went out.
    await supabaseAdmin.from("message_log").insert({
      workspace_id: ws.id, event_id: o.event?.id || null, client_id: o.client.id, channel: "email", template_name: o.templateName,
      recipient: o.client.email, status: "failed", error: `Missing details: ${missing.map((k) => `{${k}}`).join(", ")}`,
      automated: true, rule_key: o.rule, dedupe_key: o.key, created_by_id: o.createdBy,
    });
    counters.failed++;
    return;
  }
  const r = await sendClientEmailNow({
    workspace: ws, account, client: o.client, eventId: o.event?.id, subject: subject.text, body: body.text,
    templateId: o.cfg.template_id, templateName: o.templateName, createdBy: o.createdBy, automated: true, ruleKey: o.rule, dedupeKey: o.key,
  });
  if (r.skipped) counters.skipped++; else if (r.ok) counters.emailed++; else counters.failed++;
}

async function runRules(ws: any, counters: Counters) {
  const now = nowIn(ws.timezone);
  const prefs = safeJson<any>(ws.display_preferences) || {};
  const auto = prefs.message_automation;
  const rules: Record<string, any> = auto?.rules || {};
  if (auto?.enabled === false) return; // master switch off
  // Only photography, event management and catering have a yearly "anniversary" worth wishing (same list as
  // supportsAnniversary in src/lib/businessTypeProfiles.js). A workspace with no category yet keeps it.
  const noAnniversary = !!ws.business_category && !["PHOTOGRAPHY", "EVENT_MANAGEMENT", "CATERING"].includes(ws.business_category);
  const active = Object.entries(rules).filter(([k, r]) => r?.enabled && String(r.body || "").trim() && !(noAnniversary && k === "anniversary"));
  if (!active.length) return;
  const hour = Math.min(23, Math.max(0, Number(auto.send_hour ?? 10)));
  if (now.nowMinutes < hour * 60) return;

  const pro = await isProWorkspace(ws.id, ws.owner_user_id);
  const account = pro ? await getGmailAccount(ws.id) : null;
  const emailOk = !!account && account.status === "active";
  const createdBy = account?.user_id || ws.owner_user_id;

  const { data: events } = await supabaseAdmin.from("events")
    .select("id, client_id, title, start_date, end_date, event_dates, venue, status, contract_value, settled, misc_expenses_json")
    .eq("workspace_id", ws.id).neq("status", "cancelled").limit(3000);
  const eventById = new Map((events || []).map((e: any) => [e.id, e]));

  const { data: clientRows } = await supabaseAdmin.from("clients").select("id, name, email, phone").eq("workspace_id", ws.id).limit(5000);
  const clientById = new Map((clientRows || []).map((c: any) => [c.id, c]));

  type Cand = { rule: string; key: string; client: any; event: any; dateISO?: string; amount?: number; years?: number };
  const cands: Cand[] = [];
  const today = now.todayISO;

  for (const [rule, cfg] of active) {
    if (rule === "payment_due") {
      const { data: milestones } = await supabaseAdmin.from("payment_milestones")
        .select("id, event_id, client_id, due_date, due_amount, paid_amount").eq("workspace_id", ws.id).not("due_date", "is", null).limit(3000);
      for (const ms of milestones || []) {
        const event: any = ms.event_id ? eventById.get(ms.event_id) : null;
        if (!event || event.settled) continue;
        const pending = (Number(ms.due_amount) || 0) - (Number(ms.paid_amount) || 0);
        if (pending <= 0) continue;
        const d = diffDays(today, String(ms.due_date).slice(0, 10)); // >0 upcoming, 0 today, <0 overdue
        const before = Number(cfg.before_days) || 0;
        const every = Number(cfg.overdue_every_days) || 0;
        const max = Number(cfg.overdue_max) || 3;
        let stage = "";
        if (before > 0 && d === before) stage = `b${before}`;
        else if (d === 0 && cfg.on_due !== false) stage = "due";
        else if (d < 0 && every > 0 && (-d) % every === 0 && (-d) / every <= max) stage = `o${-d}`;
        if (!stage) continue;
        cands.push({ rule, key: `auto:payment_due:${ms.id}:${stage}`, client: clientById.get(ms.client_id || event.client_id), event, dateISO: String(ms.due_date).slice(0, 10), amount: pending });
      }
    } else if (rule === "event_upcoming") {
      const before = Number(cfg.before_days) || 1;
      for (const e of events || []) {
        if (e.settled || e.status !== "upcoming" || diffDays(today, String(e.start_date).slice(0, 10)) !== before) continue;
        cands.push({ rule, key: `auto:event_upcoming:${e.id}:${e.start_date}`, client: clientById.get(e.client_id), event: e });
      }
    } else if (rule === "thank_you") {
      const after = Number(cfg.after_days) || 2;
      for (const e of events || []) {
        if (e.status === "upcoming" || diffDays(lastDateOf(e), today) !== after) continue;
        cands.push({ rule, key: `auto:thank_you:${e.id}`, client: clientById.get(e.client_id), event: e });
      }
    } else if (rule === "anniversary") {
      const year = Number(today.slice(0, 4));
      for (const e of events || []) {
        const start = String(e.start_date).slice(0, 10);
        const startYear = Number(start.slice(0, 4));
        if (start.slice(5) !== today.slice(5) || startYear >= year) continue;
        cands.push({ rule, key: `auto:anniversary:${e.id}:${year}`, client: clientById.get(e.client_id), event: e, years: year - startYear });
      }
    }
  }

  for (const c of cands) {
    const cfg = rules[c.rule];
    if (!c.client) { counters.skipped++; continue; }
    const channel = cfg.channel || "email";
    const label = c.rule === "event_upcoming" ? buildValues({ client: c.client, event: c.event, workspace: ws }).workItem + " reminder" : RULE_LABEL[c.rule];

    if (channel === "email" || channel === "both") {
      if (!emailOk || !c.client.email) counters.skipped++;
      else {
        const money = await moneyFor(ws.id, c.event);
        const values = buildValues({ client: c.client, event: c.event, workspace: ws, amount: c.amount ?? money.pending, total: money.total, paid: money.paid, dateISO: c.dateISO, years: c.years });
        await emailCandidate(ws, account, { rule: c.rule, cfg, client: c.client, event: c.event, values, key: c.key, createdBy, templateName: cfg.template_name || RULE_LABEL[c.rule] }, counters);
      }
    }
    if (channel === "whatsapp" || channel === "both") {
      const money = await moneyFor(ws.id, c.event);
      const values = buildValues({ client: c.client, event: c.event, workspace: ws, amount: c.amount ?? money.pending, total: money.total, paid: money.paid, dateISO: c.dateISO, years: c.years });
      const text = renderTemplate(cfg.body, values).text;
      await notifyWhatsApp(ws, pro, { client: c.client, event: c.event, label, key: c.key, body: text, templateName: cfg.template_name || RULE_LABEL[c.rule], rule: c.rule }, counters);
    }
  }
}

async function runScheduled(counters: Counters) {
  const { data: due } = await supabaseAdmin.from("scheduled_messages").select("*").eq("status", "pending").lte("send_at", new Date().toISOString()).limit(100);
  for (const s of due || []) {
    // Claim it first, so two overlapping runs cannot both send it.
    const { data: claimed } = await supabaseAdmin.from("scheduled_messages").update({ status: "processing" }).eq("id", s.id).eq("status", "pending").select("id");
    if (!(claimed || []).length) continue;
    let status = "sent";
    let error: string | null = null;
    try {
      const [{ data: ws }, { data: client }, { data: event }] = await Promise.all([
        supabaseAdmin.from("workspaces").select("*").eq("id", s.workspace_id).single(),
        supabaseAdmin.from("clients").select("id, name, email, phone").eq("id", s.client_id).maybeSingle(),
        s.event_id ? supabaseAdmin.from("events").select("*").eq("id", s.event_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (!ws || !client) throw new Error("The client or workspace no longer exists");
      const pro = await isProWorkspace(ws.id, ws.owner_user_id);
      if (s.channel === "whatsapp") {
        if (!client.phone) throw new Error("This client has no phone number");
        const money = event ? await moneyFor(ws.id, event) : { total: 0, paid: 0, pending: 0 };
        const values = buildValues({ client, event, workspace: ws, amount: event ? money.pending : undefined, total: event ? money.total : undefined, paid: event ? money.paid : undefined });
        await notifyWhatsApp(ws, pro, { client, event, label: "scheduled message", key: `sched:${s.id}`, body: renderTemplate(s.body, values).text, templateName: s.template_name || "Scheduled message", rule: "scheduled" }, { emailed: 0, whatsapp: 0, skipped: 0, failed: 0 });
        counters.whatsapp++;
      } else {
        const account = pro ? await getGmailAccount(ws.id) : null;
        if (!pro) throw new Error("Emailing clients from Gmail is a Pro feature");
        if (!account || account.status !== "active") throw new Error("Gmail is not connected");
        if (!client.email) throw new Error("This client has no email address");
        const money = event ? await moneyFor(ws.id, event) : { total: 0, paid: 0, pending: 0 };
        const values = buildValues({ client, event, workspace: ws, amount: event ? money.pending : undefined, total: event ? money.total : undefined, paid: event ? money.paid : undefined });
        const subject = renderTemplate(s.subject, values);
        const body = renderTemplate(s.body, values);
        const missing = [...new Set([...subject.missing, ...body.missing])];
        if (missing.length) throw new Error(`Missing details: ${missing.map((k) => `{${k}}`).join(", ")}`);
        const r = await sendClientEmailNow({ workspace: ws, account, client, eventId: s.event_id, subject: subject.text, body: body.text, templateId: s.template_id, templateName: s.template_name, createdBy: s.created_by_id || account.user_id, dedupeKey: `sched:${s.id}` });
        if (!r.ok) throw new Error(r.error || "Could not send");
        counters.emailed++;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Could not send";
      counters.failed++;
    }
    await supabaseAdmin.from("scheduled_messages").update({ status, error }).eq("id", s.id);
  }
}

Deno.serve(withCors(async (req) => {
  try {
    if (!isCronRequest(req)) return Response.json({ error: "Not allowed" }, { status: 401 });
    const counters: Counters = { emailed: 0, whatsapp: 0, skipped: 0, failed: 0 };

    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*");
    for (const ws of workspaces || []) {
      try { await runRules(ws, counters); } catch (e) { console.error("automation failed for", ws.id, e); }
    }
    await runScheduled(counters);
    return Response.json({ ok: true, ...counters });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}));
