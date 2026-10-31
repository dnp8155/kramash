import { useState, useRef, useEffect, useCallback } from "react";
import { Send, CheckCircle2, Loader2, MessageSquare, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Card from "@/components/common/Card";
import CardTitle from "./CardTitle";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { cn } from "@/lib/utils";
import DateRangeChips from "@/components/common/DateRangeChips";
import { getBusinessTerminology, resolveBusinessCategory } from "@/lib/businessTerminology";
import { getProfile } from "@/lib/businessTypeProfiles";
import { todayISO, formatDate } from "@/lib/dates";
import { openDatePicker } from "@/lib/openDatePicker";
import { sanitizePhoneInput, isValidPhone, PHONE_HINT } from "@/lib/validation";

const EMPTY = { name: "", phone: "", email: "", event_type: "", event_date: "", event_end_date: "", event_dates: [], message: "", website: "" };

const MAX_DAYS = 15;
const MESSAGE_LIMIT = 900;
const MESSAGE_WARN_AT = 800;

// Spam protection the visitor never sees: when the form loads it asks the server for a signed challenge and solves
// a small proof-of-work in the background (a fraction of a second). Submitting needs that proof; see submitProfileInquiry.
function leadingZeroBits(bytes) {
  let bits = 0;
  for (const b of bytes) {
    if (b === 0) { bits += 8; continue; }
    bits += Math.clz32(b) - 24;
    break;
  }
  return bits;
}
async function solveChallenge(prefix, bits) {
  const enc = new TextEncoder();
  for (let nonce = 0; ; nonce++) {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${prefix}.${nonce}`)));
    if (leadingZeroBits(hash) >= bits) return String(nonce);
    if (nonce % 300 === 299) await new Promise((r) => setTimeout(r, 0)); // let the page stay responsive
  }
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Every day from start to end (inclusive), as YYYY-MM-DD, never more than MAX_DAYS.
function daysBetween(start, end) {
  if (!start || !end || end < start) return [];
  const out = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last && out.length < MAX_DAYS) {
    out.push(iso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// The latest end date that keeps the range within MAX_DAYS.
function latestEnd(start) {
  const d = new Date(`${start}T12:00:00`);
  d.setDate(d.getDate() + MAX_DAYS - 1);
  return iso(d);
}

// Google reCAPTCHA v3: loaded only when the server says it is switched on. Nothing is shown to the visitor; a token is
// asked for at the moment of sending, and Google's rules ask for their notice to be shown where the badge is hidden.
let recaptchaLoad = null;
function loadRecaptcha(siteKey) {
  if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);
  if (!recaptchaLoad) {
    recaptchaLoad = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      s.async = true;
      s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
      s.onerror = () => { recaptchaLoad = null; reject(new Error("Couldn't load the security check")); };
      document.head.appendChild(s);
    });
  }
  return recaptchaLoad;
}
const recaptchaToken = (siteKey) => loadRecaptcha(siteKey).then((g) => g.execute(siteKey, { action: "inquiry" }));

function Field({ label, className, children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

// "Send an inquiry" on the public profile. Becomes a lead for the business owner (see submitProfileInquiry).
// `website` is a honeypot: hidden from people, filled by bots.
export default function InquiryForm({ slug, workspace }) {
  // Wording follows the business category: an architect sees "Project", a photographer "Event", a salon its own terms.
  const term = getBusinessTerminology(workspace);
  const noun = term.workItemSingular.toLowerCase();
  const types = getProfile(resolveBusinessCategory(workspace)).eventTypes || [];
  const businessName = workspace?.name;
  // Suggestions narrow as they type; anything typed is accepted, so a new kind of work can be entered too.
  const [form, setForm] = useState(EMPTY);
  // One day, or several (a range whose days the visitor can untick, exactly like the Leads form in the app).
  const [dateMode, setDateMode] = useState("single");
  const proofRef = useRef(null); // promise of { ts, sig, nonce } for the next submit
  // Google reCAPTCHA, only when the server has it switched on (it sends its site key with the challenge).
  const [captchaKey, setCaptchaKey] = useState("");
  const prepareProof = useCallback(() => {
    const run = (async () => {
      const ch = await base44.functions.invoke("submitProfileInquiry", { action: "challenge", slug });
      const key = ch.recaptcha_site_key || "";
      setCaptchaKey(key);
      if (key) loadRecaptcha(key).catch(() => {}); // start loading now so sending is not delayed
      const nonce = await solveChallenge(`${slug}.${ch.ts}`, ch.bits);
      return { ts: ch.ts, sig: ch.sig, nonce };
    })();
    run.catch(() => {});
    proofRef.current = run;
  }, [slug]);
  useEffect(() => { prepareProof(); }, [prepareProof]);
  const trimmedRef = useRef(false); // the range was cut back to MAX_DAYS (read on the render that follows the change)
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const typed = form.event_type.trim().toLowerCase();
  const suggestions = types.filter((t) => t !== "Other" && (!typed || t.toLowerCase().includes(typed) || t.toLowerCase() === typed));
  const switchDateMode = (mode) => {
    setDateMode(mode);
    trimmedRef.current = false;
    setForm((p) => mode === "multi"
      ? { ...p, event_end_date: p.event_date, event_dates: p.event_date ? [p.event_date] : [] }
      : { ...p, event_end_date: "", event_dates: [] });
  };
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    // Autofill can fill fields without React noticing, so read what is really in the form.
    const fd = new FormData(e.currentTarget);
    const live = (k, cur) => String(fd.get(k) ?? "").trim() || cur;
    const data = { ...form, name: live("name", form.name), phone: sanitizePhoneInput(live("phone", form.phone)), email: live("email", form.email) };
    if (!data.name.trim()) { setError("Please enter your name."); return; }
    if (!data.phone.trim()) { setError("Please enter your phone number."); return; }
    if (!isValidPhone(data.phone)) { setError(PHONE_HINT); return; }
    if (!data.email.trim()) { setError("Please enter your email."); return; }
    setError("");
    setSending(true);
    try {
      const { event_end_date, event_dates, ...rest } = data;
      const dates = dateMode === "multi" ? { event_end_date, event_dates } : { event_end_date: "", event_dates: [] };
      const proof = await proofRef.current;
      let recaptcha = {};
      if (captchaKey) {
        try { recaptcha = { recaptcha_token: await recaptchaToken(captchaKey) }; }
        catch { throw new Error("Couldn't load the security check. Please reload the page and try again."); }
      }
      await base44.functions.invoke("submitProfileInquiry", { slug, ...rest, ...dates, ...proof, ...recaptcha });
      setSent(true);
      setForm(EMPTY);
      setDateMode("single");
      prepareProof(); // each message needs its own proof
    } catch (err) {
      setError(err?.data?.error || err?.message || "Couldn't send your inquiry. Please try again.");
      // Each proof is used once. Sent too quickly? Keep it and let them press send again in a moment.
      if (err?.data?.code !== "TOO_FAST") prepareProof();
    } finally { setSending(false); }
  };

  return (
    <Card id="inquiry" className="relative p-5 scroll-mt-4">
      <CardTitle icon={MessageSquare} className="mb-0">Send an Inquiry</CardTitle>
      {sending && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-card/70 backdrop-blur-[1px]">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="sr-only">Sending your inquiry…</span>
        </div>
      )}
      {sent ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Thank you! Your inquiry has been sent.</p>
          <p className="text-xs text-muted-foreground mt-1">{businessName ? `${businessName} will` : "They will"} get back to you soon.</p>
          <button type="button" onClick={() => setSent(false)} className="text-xs text-primary hover:underline mt-3">Send another</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <p className="text-xs text-muted-foreground -mt-2">Tell us a little about your {noun} and we'll get in touch.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Your name *"><Input name="name" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" /></Field>
            <Field label="Phone *"><Input name="phone" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))} maxLength={20} inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Email *"><Input name="email" value={form.email} onChange={set("email")} maxLength={120} inputMode="email" autoComplete="email" autoCapitalize="none" /></Field>
            <Field label={term.workItemTypeLabel} className="sm:col-span-2">
              <Input value={form.event_type} onChange={set("event_type")} maxLength={80} placeholder={`Pick one below or type your own`} />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestions.map((t) => {
                    const on = form.event_type.trim().toLowerCase() === t.toLowerCase();
                    return (
                      <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, event_type: on ? "" : t }))} aria-pressed={on} className={cn("px-2.5 py-1 rounded-full border text-xs transition-colors", on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted")}>{t}</button>
                    );
                  })}
                </div>
              )}
            </Field>
            <Field label={`Preferred ${noun} date (optional)`} className="sm:col-span-2">
              <div className="inline-flex rounded-full border border-border bg-card p-0.5 mb-2" role="group" aria-label="Single day or multiple days">
                {[["single", "Single day"], ["multi", "Multiple days"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={dateMode === v} onClick={() => switchDateMode(v)} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", dateMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                ))}
              </div>
              {dateMode === "single" ? (
                <div className="relative w-full sm:w-56 h-9">
                  {/* Native date inputs render blank on some phones, so the chosen date is drawn here and the real input sits invisibly on top to take the tap. */}
                  <div className="absolute inset-0 flex items-center gap-2 px-3 bg-card border border-border rounded-lg text-base md:text-sm pointer-events-none">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className={form.event_date ? "text-foreground" : "text-muted-foreground"}>{form.event_date ? formatDate(form.event_date) : "Select a date"}</span>
                  </div>
                  <input
                    type="date"
                    aria-label={`Preferred ${noun} date`}
                    value={form.event_date}
                    min={todayISO()}
                    onChange={set("event_date")}
                    onClick={openDatePicker}
                    className="date-overlay"
                  />
                </div>
              ) : (
                <DateRangeChips
                  startDate={form.event_date}
                  endDate={form.event_end_date}
                  value={form.event_dates}
                  onChange={(dates) => setForm((p) => ({ ...p, event_dates: dates }))}
                  onStartChange={(v) => setForm((p) => {
                    const end = v && p.event_end_date && p.event_end_date > latestEnd(v) ? latestEnd(v) : p.event_end_date;
                    trimmedRef.current = end !== p.event_end_date;
                    return { ...p, event_date: v, event_end_date: end, event_dates: daysBetween(v, end) };
                  })}
                  onEndChange={(v) => setForm((p) => {
                    const end = p.event_date && v && v > latestEnd(p.event_date) ? latestEnd(p.event_date) : v;
                    trimmedRef.current = end !== v;
                    return { ...p, event_end_date: end, event_dates: daysBetween(p.event_date, end) };
                  })}
                  dayLabel={term.dayLabel}
                  followStart
                />
              )}
              {dateMode === "multi" && (
                <p className={cn("text-[11px] mt-2", trimmedRef.current ? "text-warning" : "text-muted-foreground")}>
                  {trimmedRef.current ? `We cut it back to ${MAX_DAYS} days. For a longer ${noun}, mention the rest in your message.` : `You can pick up to ${MAX_DAYS} days. For a longer ${noun}, mention it in your message.`}
                </p>
              )}
            </Field>
          </div>
          <Field label="Message">
            <textarea value={form.message} onChange={set("message")} maxLength={MESSAGE_LIMIT} rows={3} placeholder={`What you need for your ${noun}, where, and any details that will help`} className="w-full px-3 py-2 text-base md:text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />
            <div className="flex justify-end mt-1.5">
              <span className={cn("text-[11px] tabular-nums px-1.5 py-0.5 rounded-full", form.message.length >= MESSAGE_LIMIT ? "bg-destructive/10 text-destructive font-medium" : form.message.length >= MESSAGE_WARN_AT ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}>
                {form.message.length} / {MESSAGE_LIMIT} characters
              </span>
            </div>
          </Field>
          {/* Honeypot */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
          </div>
          <p className="text-[11px] text-muted-foreground">Your details are shared only with this business and used to reply to you. See the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.</p>
          {captchaKey && (
            <p className="text-[10px] text-muted-foreground">
              This form is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms of Service</a> apply.
            </p>
          )}
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send inquiry</>}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
