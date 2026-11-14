import { formatDatesList, formatDate } from "@/lib/dates";

// The assistant sometimes answers in Markdown (### headings, **bold**, * bullets). The chat shows plain text, so those
// symbols are turned into readable text. The Edge Function (agentChat) has the same clean-up before it saves a reply.
export function plainChatText(input) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/```[a-z]*\n?/gi, "")                       // code fences
    .replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "")                   // ### headings
    .replace(/^[ \t]*[*\-+][ \t]+/gm, "• ")                      // * - + bullets
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1")              // ***bold italic***
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")                  // **bold**
    .replace(/__([^_\n]+)__/g, "$1")                      // __bold__
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1$2")    // *italic*
    .replace(/`([^`\n]+)`/g, "$1")                        // `code`
    .replace(/\[([^\]\n]+)\]\((?:[^)\n]+)\)/g, "$1")      // [label](link)
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, "")                   // --- lines
    .replace(/\*{2,}/g, "")                               // stray ** left over mid-stream
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Turns the assistant's plain reply into blocks the chat can draw as rich text. This only reads the text that already
// came back (• bullets, "1." steps, "Heading:" lines, blank-line groups), so the AI is not asked for anything extra
// and no extra tokens are used.
//   → [{ type: "heading" | "para" | "ul" | "ol", text?, items? }]
export function parseChatBlocks(input) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of localizeDates(plainChatText(input)).split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const bullet = line.match(/^•\s+(.*)$/);
    const step = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (bullet) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(bullet[1]);
    } else if (step) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(step[2]);
    } else {
      // "Date: …", "Client: …", "Venue: …" lines next to each other read as one small details box.
      const kv = line.match(/^([A-Za-z][A-Za-z ./&'’-]{0,24}):\s+(\S.*)$/);
      if (kv) {
        if (!list || list.type !== "kv") { flush(); list = { type: "kv", items: [] }; }
        list.items.push({ label: kv[1], value: kv[2] });
        continue;
      }
      flush();
      // A short line ending in ":" introduces what follows, so it reads as a small heading.
      if (/:$/.test(line) && line.length <= 70) blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      else blocks.push({ type: "para", text: line });
    }
  }
  flush();
  return blocks;
}

// Splits a line into pieces so amounts (₹5,000) and "Name – amount" pairs can be styled.
export function parseInline(text) {
  const out = [];
  const re = /(₹\s?[\d,]+(?:\.\d+)?)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    out.push({ t: "amount", v: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

// ISO dates (2026-11-15) in a reply are shown the way the workspace has chosen to see dates, and a long run of
// dates ("2026-12-09, 2026-12-10, 2026-12-11") is folded into one short, grouped list.
export function localizeDates(text) {
  const D = "\\d{4}-\\d{2}-\\d{2}";
  const run = new RegExp(`\\b${D}(?:(?:,\\s*|\\s+and\\s+)${D})*\\b`, "g");
  return String(text ?? "").replace(run, (m) => {
    const dates = m.match(new RegExp(D, "g")) || [];
    return dates.length === 1 ? formatDate(dates[0]) : formatDatesList(dates);
  });
}

// A list item like "Prachi's Baby Shower – 17 Nov 2026 at Atithya Banquet · Day 2: Home" becomes a title plus small
// detail lines, so long items stop reading as one wall of text.
export function splitItem(text) {
  const m = text.match(/^(.{1,80}?)\s[–—-]\s(.+)$/);
  if (!m || /₹/.test(m[2])) return { title: text, details: [] };
  const [when, ...rest] = m[2].split(/\s+at\s+/);
  const where = rest.join(" at ");
  const details = [when, ...(where ? where.split(/\s+·\s+/) : [])].map((x) => x.trim()).filter(Boolean);
  return { title: m[1], details };
}

// ---- "Open" links inside a reply ----
// The reply is matched against the workspace's own events, clients and team members (and page names such as
// "Financial page"), so a small "Open" link can take you straight there. Nothing is sent to the AI for this.
export function buildLinkIndex({ events = [], clients = [], members = [] } = {}) {
  const raw = [
    ...events.map((e) => ({ name: e.title, to: `/events/${e.id}`, label: "Open event" })),
    ...clients.map((c) => ({ name: c.name, to: `/clients/${c.id}`, label: "Open client" })),
    ...members.map((m) => ({ name: m.name, to: `/team/${m.id}`, label: "Open member" })),
  ].map((x) => ({ ...x, key: String(x.name || "").trim().toLowerCase() })).filter((x) => x.key.length >= 3);
  // Two records with the same name: skip both rather than risk opening the wrong one.
  const count = {};
  raw.forEach((x) => { count[x.key] = (count[x.key] || 0) + 1; });
  return raw.filter((x) => count[x.key] === 1).sort((a, b) => b.key.length - a.key.length);
}

const isWordChar = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
export function findEntityLink(text, index) {
  const low = String(text || "").toLowerCase();
  for (const x of index || []) {
    let from = 0, at;
    while ((at = low.indexOf(x.key, from)) !== -1) {
      if (!isWordChar(low[at - 1]) && !isWordChar(low[at + x.key.length])) return x;
      from = at + 1;
    }
  }
  return null;
}

const PAGES = [
  ["your plan", "/plan", "Your Plan"], ["financial", "/financial", "Financial"], ["events", "/events", "Events"],
  ["clients", "/clients", "Clients"], ["leads", "/leads", "Leads"], ["team", "/team", "Team"],
  ["calendar", "/calendar", "Calendar"], ["quotations", "/quotation", "Quotations"], ["quotation", "/quotation", "Quotations"],
  ["invoices", "/invoices", "Invoices"], ["preferences", "/preferences", "Preferences"], ["help", "/help", "Help"],
  ["storage", "/storage", "Storage"], ["my profile", "/my-profile", "My Profile"], ["rate estimator", "/rate-estimator", "Rate Estimator"],
];
export function findPageLink(text) {
  const low = String(text || "").toLowerCase();
  for (const [name, to, title] of PAGES) {
    if (low.includes(`${name} page`) || low.includes(`${name} tab`)) return { to, label: `Open ${title}` };
  }
  return null;
}
