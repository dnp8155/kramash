import { withCors } from "../_shared/cors.ts";
// submitProfileInquiry — the enquiry form on a published My Profile page. A visitor (not signed in) sends a
// message; it becomes a LEAD (source "website", status "new") for the business owner, plus a bell entry.
// From there the owner uses the normal Leads flow (follow-ups, convert to client + event).
//
// Anti-spam, in layers (no CAPTCHA, nothing for the visitor to solve by hand):
//   1. Only a published profile whose owner switched the inquiry form on.
//   2. Honeypot field that people never see.
//   3. Signed challenge + small proof-of-work: the page asks for a challenge when it loads and solves it in the
//      background (a fraction of a second). A bot has to run that work for every single message. The challenge is
//      signed by the server, expires, can't be reused, and a message can't arrive faster than a person can type it.
//   4. Content rules: no web addresses in the name, at most one link in the message, no keyboard-mash.
//   5. Limits: per visitor address, per workspace per hour and per day; same phone/email or same message is saved
//      once per 24h; the workspace's lead plan limit is respected.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { safeJson } from "../_shared/helpers.ts";
import { resolvePlanContext, countUsage, checkResourceLimit, SUB_STATUS } from "../_shared/planEngine.ts";
import { sendPushToUser } from "../_shared/sendPush.ts";

const MAX_PER_HOUR = 10;
const MAX_PER_DAY = 40;
const IP_MAX_PER_HOUR = 8;
const POW_BITS = 15;            // about 32,000 hashes on average: a blink for a phone, a real cost for a bot farm
const MIN_FILL_MS = 4000;       // faster than this is not a person typing
const MAX_AGE_MS = 30 * 60 * 1000;
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmac(msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function leadingZeroBits(bytes: Uint8Array) {
  let bits = 0;
  for (const b of bytes) {
    if (b === 0) { bits += 8; continue; }
    bits += Math.clz32(b) - 24;
    break;
  }
  return bits;
}
// Best effort, per running instance: visitor address -> recent attempts, and challenges already used.
const ipHits = new Map<string, number[]>();
const usedProofs = new Map<string, number>();
const tooMany = (ip: string) => {
  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter((t) => now - t < 3600_000);
  ipHits.set(ip, recent);
  if (ipHits.size > 5000) ipHits.clear();
  return recent.length >= IP_MAX_PER_HOUR;
};
const noteHit = (ip: string) => ipHits.set(ip, [...(ipHits.get(ip) || []), Date.now()]);
const markUsed = (sig: string) => {
  const now = Date.now();
  for (const [k, exp] of usedProofs) if (exp < now) usedProofs.delete(k);
  usedProofs.set(sig, now + MAX_AGE_MS);
};
const bad = (error: string, status = 400, code?: string) => Response.json({ error, ...(code ? { code } : {}) }, { status });
const hasUrl = (s: string) => /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|xyz|top|info|biz|site|online|link|click)\b)/i.test(s);
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Bots fill every field; people never see this one.
    if (clean(body?.website, 200)) return Response.json({ ok: true });

    const slug = clean(body?.slug, 60);
    const name = clean(body?.name, 80);
    const phone = clean(body?.phone, 20).replace(/[^\d+\s()-]/g, "");
    const email = clean(body?.email, 120).toLowerCase();
    const eventType = clean(body?.event_type, 80);
    const eventDateRaw = clean(body?.event_date, 10);
    const eventEndRaw = clean(body?.event_end_date, 10);
    const eventDatesRaw: unknown[] = Array.isArray(body?.event_dates) ? body.event_dates.slice(0, 40) : [];
    const message = clean(body?.message, 1000);

    if (!slug) return Response.json({ error: "Missing page." }, { status: 400 });

    // The page asks for a challenge as soon as it loads.
    if (body?.action === "challenge") {
      const ts = Date.now();
      return Response.json({ ts, sig: await hmac(`${slug}.${ts}`), bits: POW_BITS });
    }

    const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (tooMany(ip)) return bad("Too many inquiries from this device. Please try again later or contact them directly.", 429);

    // Signed, unexpired, unused challenge, solved, and not submitted faster than a person could type.
    const ts = Number(body?.ts);
    const sig = clean(body?.sig, 100);
    const nonce = clean(body?.nonce, 40);
    if (!SECRET || !Number.isFinite(ts) || !sig || !nonce) return bad("Please reload the page and try again.");
    const age = Date.now() - ts;
    if (age > MAX_AGE_MS || age < 0) return bad("This form has expired. Please reload the page and try again.");
    if (age < MIN_FILL_MS) return bad("Please take a moment to fill in the form, then send it again.", 429, "TOO_FAST");
    if (sig !== await hmac(`${slug}.${ts}`) || usedProofs.has(sig)) return bad("Please reload the page and try again.");
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${slug}.${ts}.${nonce}`)));
    if (leadingZeroBits(hash) < POW_BITS) return bad("Please reload the page and try again.");
    noteHit(ip);

    if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
    const digits = phone.replace(/\D/g, "");
    if (!phone && !email) return Response.json({ error: "Please add a phone number or an email so they can reach you." }, { status: 400 });
    if (phone && (digits.length < 7 || digits.length > 15)) return Response.json({ error: "That phone number doesn't look right." }, { status: 400 });
    if (email && !/^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
    // Content rules: real-looking name, no link farms, no keyboard-mash.
    if (hasUrl(name) || name.includes("@") || (name.match(/\d/g) || []).length >= 5 || !/\p{L}/u.test(name) || /(.)\1{5,}/u.test(name)) {
      return bad("Please enter your real name.");
    }
    if (hasUrl(eventType)) return bad("Please remove the link from the type field.");
    if ((message.match(/https?:\/\/|www\./gi) || []).length > 1 || /(.)\1{9,}/u.test(message)) {
      return bad("Please remove extra links from your message.");
    }
    // Dates are saved the way the Leads form saves them: a start date, an optional end date, and the chosen days.
    const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
    const days = [...new Set(eventDatesRaw.map((d) => clean(d, 10)).filter(Boolean))].sort();
    if ([eventDateRaw, eventEndRaw, ...days].some((d) => d && !isDate(d))) return Response.json({ error: "That date doesn't look right." }, { status: 400 });
    const MAX_DAYS = 15;
    const spanDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
    if (days.length > MAX_DAYS || (eventDateRaw && eventEndRaw && spanDays(eventDateRaw, eventEndRaw) > MAX_DAYS)) {
      return Response.json({ error: `Please pick up to ${MAX_DAYS} days, or describe the rest in your message.` }, { status: 400 });
    }
    let eventDate: string | null = eventDateRaw || days[0] || null;
    let eventEnd: string | null = eventEndRaw || (days.length > 1 ? days[days.length - 1] : null);
    if (eventDate && eventEnd && eventEnd < eventDate) eventEnd = null;
    if (!eventEnd || eventEnd === eventDate) eventEnd = null;

    const { data: workspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, owner_user_id, display_preferences, public_profile_enabled")
      .eq("public_profile_slug", slug)
      .order("created_at", { ascending: false })
      .limit(1);
    const ws = workspaces?.[0];
    const dp = ws ? (safeJson(ws.display_preferences) || {}) : {};
    if (!ws || !ws.public_profile_enabled || dp.public_inquiry_enabled !== true) {
      return Response.json({ error: "This page isn't taking inquiries." }, { status: 404 });
    }

    const ctx = await resolvePlanContext(ws.id);
    if (ctx.subscription && ctx.subscription.status === SUB_STATUS.SUSPENDED) {
      return Response.json({ error: "This business can't take online inquiries right now. Please contact them directly." }, { status: 403 });
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabaseAdmin.from("leads").select("id", { count: "exact", head: true })
      .eq("workspace_id", ws.id).eq("source", "website").gte("created_at", hourAgo);
    if ((recent ?? 0) >= MAX_PER_HOUR) {
      return Response.json({ error: "Too many inquiries right now. Please try again later or contact them directly." }, { status: 429 });
    }
    const { count: today } = await supabaseAdmin.from("leads").select("id", { count: "exact", head: true })
      .eq("workspace_id", ws.id).eq("source", "website").gte("created_at", dayAgo);
    if ((today ?? 0) >= MAX_PER_DAY) {
      return Response.json({ error: "Too many inquiries today. Please contact them directly." }, { status: 429 });
    }

    // Same person sending twice: keep the first, tell them it went through.
    const contactFilters = [phone ? `phone.eq."${phone}"` : "", email ? `email.eq."${email}"` : ""].filter(Boolean).join(",");
    const { data: dupes } = await supabaseAdmin.from("leads").select("id")
      .eq("workspace_id", ws.id).eq("source", "website").gte("created_at", dayAgo).or(contactFilters).limit(1);
    if (dupes && dupes.length > 0) { markUsed(sig); return Response.json({ ok: true }); }
    // The same message sent again (copy-paste blasts) is kept once.
    if (message.length >= 10) {
      const { data: sameText } = await supabaseAdmin.from("leads").select("id")
        .eq("workspace_id", ws.id).eq("source", "website").gte("created_at", dayAgo).eq("notes", message).limit(1);
      if (sameText && sameText.length > 0) { markUsed(sig); return Response.json({ ok: true }); }
    }

    const usage = await countUsage(ws.id, "max_leads");
    const check = checkResourceLimit(ctx.limits, "max_leads", usage);
    if (!check.allowed) {
      return Response.json({ error: "This business can't take online inquiries right now. Please contact them directly." }, { status: 403 });
    }

    // Leads are private to the user who created them, so the lead belongs to the owner.
    const { data: lead, error } = await supabaseAdmin.from("leads").insert({
      workspace_id: ws.id,
      name,
      phone: phone || null,
      email: email || null,
      source: "website",
      event_type: eventType || null,
      event_date: eventDate,
      event_end_date: eventEnd,
      event_dates: days,
      status: "new",
      priority: "warm",
      notes: message || null,
      description: "Sent from your My Profile inquiry form",
      created_by_id: ws.owner_user_id,
    }).select("id").single();
    if (error) throw error;
    markUsed(sig);

    const title = `New inquiry from ${name}`;
    const text = `${eventType ? `${eventType} · ` : ""}Sent from your My Profile page. Find it in Leads.`;
    await supabaseAdmin.from("notifications").insert({
      workspace_id: ws.id,
      user_id: ws.owner_user_id,
      type: "general",
      title,
      message: text,
      related_entity_type: "leads",
      related_entity_id: lead.id,
      read: false,
    });

    // Push, same rules as the lead reminders: Pro plan (notifications_enabled), and the owner has Push and Leads
    // notifications on. Best effort: the lead and the bell entry already exist if this fails.
    try {
      const { data: prof } = await supabaseAdmin.from("profiles").select("notification_preferences").eq("id", ws.owner_user_id).single();
      const prefs = prof?.notification_preferences || {};
      if (ctx.limits?.notifications_enabled === true && prefs.push !== false && prefs.leads !== false) {
        await sendPushToUser(ws.owner_user_id, title, text, { entity_type: "leads", entity_id: lead.id, url: "/leads" }, `leads:${lead.id}`);
      }
    } catch { /* push is optional */ }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: "Couldn't send your inquiry. Please try again."  }, { status: 500 });
  }
}));
