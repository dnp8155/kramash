// The five Track statuses. The first three are fixed; the last two are named by the business in Preferences
// (Types & Display → Track). The stored values stay the same whatever the names are.
import { CircleDashed, Loader, PackageCheck, Send, CheckCheck, Truck, Printer, BadgeCheck, PackageOpen, ClipboardCheck, PenLine, Wallet, Pause, Ban, Cloud, Mail } from "lucide-react";

export const TRACK_DEFAULT_NAMES = ["Sent to client", "Delivered"];
export const TRACK_MAX_NAME = 20;

const BASE = [
  { value: "not_started", label: "To be started", Icon: CircleDashed, cls: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "In progress", Icon: Loader, cls: "bg-warning/15 text-warning" },
  { value: "ready", label: "Ready", Icon: PackageCheck, cls: "bg-primary/10 text-primary" },
  { value: "sent", label: "", Icon: Send, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  { value: "delivered", label: "", Icon: CheckCheck, cls: "bg-success/15 text-success" }
];

// The icon and colour of a custom status follow the name the business wrote (first match wins), so "Sent for printing"
// gets a rose printer and "Approved" a green badge. A name that is not recognised keeps the slot's own icon and colour.
// Colours for custom names. The three fixed tags are grey, amber and blue, so none of those (or anything close to them)
// is used here: only green, violet, teal, rose, fuchsia and red.
const TONE = {
  green: "bg-success/15 text-success",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  red: "bg-destructive/10 text-destructive",
};
const NAME_RULES = [
  [/print/i, Printer, TONE.rose],
  [/out for deliver|dispatch|ship|courier|transit|on the way/i, Truck, TONE.teal],
  [/collect|pick ?up|picked|hand ?over|handed|receiv/i, PackageOpen, TONE.fuchsia],
  [/approv|accept|confirm|signed|sign-off/i, BadgeCheck, TONE.green],
  [/review|proof|verif|check|feedback|inspect/i, ClipboardCheck, TONE.violet],
  [/edit|design|draft|retouch|revis/i, PenLine, TONE.violet],
  [/paid|payment|invoice|billed|bill\b/i, Wallet, TONE.green],
  [/hold|pause|wait|pending|delay/i, Pause, TONE.fuchsia],
  [/cancel|reject|declin|drop/i, Ban, TONE.red],
  [/upload|cloud|drive|online|download|link/i, Cloud, TONE.teal],
  [/e-?mail|mailed/i, Mail, TONE.teal],
  [/complet|done|finish|clos|final|deliver/i, CheckCheck, TONE.green],
  [/\bsent\b|\bsend\b|share|whatsapp/i, Send, TONE.violet],
];
export function styleForName(name) {
  const hit = NAME_RULES.find(([re]) => re.test(String(name || "")));
  return hit ? { Icon: hit[1], cls: hit[2] } : null;
}

// names: [fourth, fifth]; anything missing or empty falls back to the default.
export function trackStatuses(names) {
  const list = Array.isArray(names) ? names : [];
  return BASE.map((s, i) => {
    if (i < 3) return s;
    const label = (typeof list[i - 3] === "string" && list[i - 3].trim()) || TRACK_DEFAULT_NAMES[i - 3];
    return { ...s, label, ...(styleForName(label) || {}) };
  });
}

// The finished status (the last one): counted as "done" and hides the expected date.
export const TRACK_DONE = "delivered";

export function statusOf(statuses, value) {
  return statuses.find((s) => s.value === value) || statuses[0];
}

export function nextStatusValue(statuses, value) {
  const i = statuses.findIndex((s) => s.value === value);
  return statuses[(i + 1) % statuses.length].value;
}
