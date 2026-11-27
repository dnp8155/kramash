// Billing emails to the workspace owner: payment receipt, Pro activated, Pro expiring, Pro expired.
//
// Sent through the same mail account Supabase Auth uses (custom SMTP), via Edge Function secrets:
//   SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASS, SMTP_FROM   — or RESEND_API_KEY instead.
// Same provider order as sendWelcomeEmail: Resend first if its key is set, otherwise SMTP.
// Sender: contact@kramasha.com, the one Kramasha mailbox (the same one Supabase Auth sends from). SMTP_FROM overrides it.
//
// Rules:
// - Never throws. A mail failure must never undo a payment or stop the reminder cron; it is only logged.
// - Owner only, and only while Preferences → Notifications → "Billing" is on (a missing key counts as ON).
// - Callers send each email once: the receipt right after the payment is claimed (activateProFromPayment lets
//   exactly one caller through), expiry emails only when generateNotifications saved a NEW reminder row.
import nodemailer from "npm:nodemailer";
import { supabaseAdmin } from "./supabaseClient.ts";

const APP_URL = () => (Deno.env.get("APP_URL") || "https://www.kramasha.com").replace(/\/+$/, "");
const PLAN_URL = () => `${APP_URL()}/plan`;

export type MailResult = { sent: boolean; provider?: string; reason?: string };
const MAIL_TIMEOUT_MS = 10_000;

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<MailResult> {
  try {
    if (!to) return { sent: false, reason: "no recipient" };
    const from = Deno.env.get("SMTP_FROM") || "Kramasha <contact@kramasha.com>";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        signal: AbortSignal.timeout(MAIL_TIMEOUT_MS), // never hold a payment or the reminder run on a slow mail server
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      return { sent: true, provider: "resend" };
    }
    const host = Deno.env.get("SMTP_HOST");
    const user = Deno.env.get("SMTP_USER");
    const pass = Deno.env.get("SMTP_PASS");
    if (host && user && pass) {
      const port = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
      const transporter = nodemailer.createTransport({
        host, port, secure: port === 465, auth: { user, pass },
        connectionTimeout: MAIL_TIMEOUT_MS, greetingTimeout: MAIL_TIMEOUT_MS, socketTimeout: MAIL_TIMEOUT_MS,
      });
      await transporter.sendMail({ from, to, subject, html, text });
      return { sent: true, provider: "smtp" };
    }
    console.warn("billingEmail: no mail provider configured (set SMTP_* or RESEND_API_KEY in Edge Function secrets)");
    return { sent: false, reason: "not configured" };
  } catch (e) {
    console.error("billingEmail: send failed", subject, (e as Error)?.message || e);
    return { sent: false, reason: (e as Error)?.message || "send failed" };
  }
}

// Owner's email, name and billing preference for a workspace.
async function ownerOf(workspaceId: string) {
  const { data: ws } = await supabaseAdmin.from("workspaces").select("name, owner_user_id, timezone").eq("id", workspaceId).maybeSingle();
  if (!ws?.owner_user_id) return null;
  const { data: p } = await supabaseAdmin.from("profiles").select("email, full_name, notification_preferences").eq("id", ws.owner_user_id).maybeSingle();
  let email = String(p?.email || "").trim();
  if (!email) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(ws.owner_user_id);
      email = String(data?.user?.email || "").trim();
    } catch { /* no auth row */ }
  }
  if (!email) return null;
  const billingOn = (p?.notification_preferences || {}).billing !== false;
  return { email, name: String(p?.full_name || "").trim(), workspaceName: String(ws.name || "").trim(), billingOn, timezone: String(ws.timezone || "Asia/Kolkata") };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2026-12-24" → "24 Dec 2026" (dates are plain calendar days; no timezone shift).
export function niceDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// The calendar day of a moment in the workspace's timezone ("2026-11-25"), so a payment at 2 am IST isn't dated the
// day before (toISOString would give the UTC day).
export function dayIn(at: string | Date, timeZone = "Asia/Kolkata"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 10);
  }
}

export function money(amount: number, currency = "INR"): string {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-IN")}`;
  }
}

const CYCLE_LABEL: Record<string, string> = { MONTHLY: "Monthly", SIX_MONTHS: "6 months", ANNUAL: "Yearly" };
export const cycleLabel = (c: string) => CYCLE_LABEL[String(c || "").toUpperCase()] || String(c || "");

type Body = { heading: string; greeting: string; lines: string[]; rows?: [string, string][]; cta?: { label: string; url: string }; foot?: string };

// Same look as the welcome email (cream page, white card, gold bar).
export function renderEmail(b: Body): { html: string; text: string } {
  const rows = (b.rows || []).map(([k, v]) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#5E6165;border-bottom:1px solid #EFEDE9;">${esc(k)}</td>
        <td align="right" style="padding:8px 0;font-size:13px;font-weight:600;color:#1A1D21;border-bottom:1px solid #EFEDE9;">${esc(v)}</td>
      </tr>`).join("");
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>${esc(b.heading)}</title></head>
<body style="margin:0;padding:0;background-color:#FDFBF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FDFBF8;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:500px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <img src="https://www.kramasha.com/kramasha_logo_192x192.png" alt="Kramasha" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;border-radius:10px;" />
    <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:20px;font-weight:700;color:#1A1D21;">Kramasha</span>
  </td></tr>
  <tr><td style="background-color:#FFFFFF;border:1px solid #E5E3DF;border-radius:16px;overflow:hidden;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr><td style="height:4px;background-color:#C8A95E;"></td></tr>
      <tr><td style="padding:32px 28px 28px 28px;">
        <h1 style="margin:0 0 14px 0;font-size:21px;font-weight:700;letter-spacing:-0.2px;color:#1A1D21;">${esc(b.heading)}</h1>
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1A1D21;">${esc(b.greeting)}</p>
        ${b.lines.map((l) => `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#5E6165;">${esc(l)}</p>`).join("")}
        ${rows ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 20px 0;">${rows}</table>` : ""}
        ${b.cta ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 4px 0;"><tr><td style="background-color:#1A1D21;border-radius:10px;">
          <a href="${esc(b.cta.url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">${esc(b.cta.label)}</a>
        </td></tr></table>` : ""}
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:20px 8px 0 8px;font-size:12px;line-height:1.6;color:#8A8D91;">
    ${esc(b.foot || "You get this email because you own this Kramasha workspace. Turn these emails off in Preferences → Notifications → Plan & billing.")}
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    b.heading, "", b.greeting, "", ...b.lines,
    ...(b.rows && b.rows.length ? ["", ...b.rows.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(b.cta ? ["", `${b.cta.label}: ${b.cta.url}`] : []),
    "", b.foot || "Turn these emails off in Preferences → Notifications → Plan & billing.",
  ].join("\n");
  return { html, text };
}

const hello = (name: string) => `Hi ${name || "there"},`;

// ---------------------------------------------------------------- payment receipt (Razorpay)
export async function sendPaymentReceiptEmail(args: {
  workspaceId: string; amount: number; currency?: string; billingCycle: string; startedAt: string; expiresAt: string;
  paymentId?: string; orderId?: string; paidAt?: string;
}): Promise<MailResult> {
  try {
    const o = await ownerOf(args.workspaceId);
    if (!o) return { sent: false, reason: "no owner email" };
    // A receipt is a record of money paid: it goes out even with billing reminders off.
    const rows: [string, string][] = [
      ["Plan", `Kramasha Pro — ${cycleLabel(args.billingCycle)}`],
      ["Amount paid", money(args.amount, args.currency || "INR")],
      ["Paid on", niceDate(dayIn(args.paidAt || new Date(), o.timezone))],
      ["Pro valid", `${niceDate(args.startedAt)} → ${niceDate(args.expiresAt)}`],
    ];
    if (o.workspaceName) rows.unshift(["Workspace", o.workspaceName]);
    if (args.paymentId) rows.push(["Payment ID", args.paymentId]);
    if (args.orderId) rows.push(["Order ID", args.orderId]);
    const { html, text } = renderEmail({
      heading: "Payment received — you're on Pro",
      greeting: hello(o.name),
      lines: ["Thank you! We've received your payment and Kramasha Pro is active on your workspace. Keep this email as your payment receipt."],
      rows,
      cta: { label: "View your plan", url: PLAN_URL() },
      foot: "This is your payment receipt for Kramasha Pro. Questions about this payment? Contact us from Help & Support in the Kramasha app.",
    });
    return sendMail(o.email, `Payment receipt — Kramasha Pro (${money(args.amount, args.currency || "INR")})`, html, text);
  } catch (e) {
    console.error("billingEmail: sendPaymentReceiptEmail failed", (e as Error)?.message || e);
    return { sent: false, reason: (e as Error)?.message || "failed" };
  }
}

// ---------------------------------------------------------------- Pro given by an admin (or free launch month)
export async function sendProActivatedEmail(args: { workspaceId: string; billingCycle: string; startedAt: string; expiresAt: string; isLaunch: boolean }): Promise<MailResult> {
  try {
    const o = await ownerOf(args.workspaceId);
    if (!o) return { sent: false, reason: "no owner email" };
    if (!o.billingOn) return { sent: false, reason: "billing emails off" };
    const rows: [string, string][] = [
      ["Plan", args.isLaunch ? "Kramasha Pro — free launch month" : `Kramasha Pro — ${cycleLabel(args.billingCycle)}`],
      ["Pro valid", `${niceDate(args.startedAt)} → ${niceDate(args.expiresAt)}`],
    ];
    if (o.workspaceName) rows.unshift(["Workspace", o.workspaceName]);
    const { html, text } = renderEmail({
      heading: args.isLaunch ? "Your free Pro month has started" : "Kramasha Pro is now active",
      greeting: hello(o.name),
      lines: [args.isLaunch
        ? "Welcome to the launch offer! Every Pro feature is unlocked on your workspace for one month, on us."
        : "Pro has been switched on for your workspace. Every Pro feature is unlocked until the date below."],
      rows,
      cta: { label: "Open Kramasha", url: APP_URL() },
    });
    return sendMail(o.email, args.isLaunch ? "Your free Kramasha Pro month has started" : "Kramasha Pro is now active", html, text);
  } catch (e) {
    console.error("billingEmail: sendProActivatedEmail failed", (e as Error)?.message || e);
    return { sent: false, reason: (e as Error)?.message || "failed" };
  }
}

// ---------------------------------------------------------------- expiring / expired
// Emails go out only at these stages (the bell still gets every stage): 7 days, 1 day, last day.
export const EXPIRY_EMAIL_STAGES = new Set(["7d", "1d", "today"]);

export async function sendExpiryEmail(args: { workspaceId: string; expiresAt: string; daysLeft: number; isLaunch: boolean; expired: boolean }): Promise<MailResult> {
  try {
    const o = await ownerOf(args.workspaceId);
    if (!o) return { sent: false, reason: "no owner email" };
    if (!o.billingOn) return { sent: false, reason: "billing emails off" };
    const date = niceDate(args.expiresAt);
    const what = args.isLaunch ? "free launch month" : "Pro plan";
    let heading: string, subject: string, lines: string[];
    if (args.expired) {
      heading = args.isLaunch ? "Your free launch month has ended" : "Your Pro plan has expired";
      subject = args.isLaunch ? "Your free Kramasha Pro month has ended" : "Your Kramasha Pro plan has expired";
      lines = [
        `Your ${what} ended on ${date}. Your workspace is now on the Free plan, and Free plan limits apply.`,
        "All your data is safe. Renew any time to switch every Pro feature back on.",
      ];
    } else {
      const when = args.daysLeft <= 0 ? "today" : args.daysLeft === 1 ? "tomorrow" : `in ${args.daysLeft} days`;
      heading = args.daysLeft <= 0 ? `Your ${what} ends today` : `Your ${what} ends ${when}`;
      subject = args.daysLeft <= 0 ? `Kramasha Pro ends today` : `Kramasha Pro ends ${when} (${date})`;
      lines = [
        `Your ${what} ends ${when}, on ${date}. After that, Free plan limits apply.`,
        "Renewing early is safe: the new period starts after this date, so you lose no days.",
      ];
    }
    const rows: [string, string][] = [[args.expired ? "Ended on" : "Ends on", date]];
    if (o.workspaceName) rows.unshift(["Workspace", o.workspaceName]);
    const { html, text } = renderEmail({ heading, greeting: hello(o.name), lines, rows, cta: { label: args.expired ? "Renew Pro" : "Renew now", url: PLAN_URL() } });
    return sendMail(o.email, subject, html, text);
  } catch (e) {
    console.error("billingEmail: sendExpiryEmail failed", (e as Error)?.message || e);
    return { sent: false, reason: (e as Error)?.message || "failed" };
  }
}
