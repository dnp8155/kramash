// Shared validation helpers for contact fields.

// Strip spaces, dashes, parentheses — keep digits and a leading +.
export function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).trim().replace(/[\s\-()]/g, "");
}

// Cleans a phone number as it is typed or pasted (WhatsApp/contacts copy-paste brings
// spaces, non-breaking spaces, dashes, brackets, dots and invisible direction marks).
//   Indian numbers are kept as plain 10 digits (98765 43210, +91 98765 43210, 09876543210 -> 9876543210).
//   Everything else is kept in international form: "+" followed by up to 15 digits.
export function sanitizePhoneInput(val) {
  if (!val) return "";
  const raw = String(val).replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return raw.startsWith("+") ? "+" : "";
  let intl = raw.startsWith("+");
  // "0091 ..." / "00 44 ..." international dialling prefix
  if (!intl && digits.startsWith("00") && digits.length > 10) { digits = digits.slice(2); intl = true; }
  if (intl) {
    if (digits.startsWith("91") && digits.length === 12) return digits.slice(2); // +91 → local 10 digits
    return "+" + digits.slice(0, 15);
  }
  if (digits.length <= 10) return digits;
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  // 11+ digits with no "+": a foreign number pasted without its plus sign.
  return "+" + digits.slice(0, 15);
}

// Valid if it is an Indian mobile (10 digits, starts 6-9) or an international number
// in E.164 form (+, country code that doesn't start with 0, 8-15 digits in total).
export function isValidPhone(raw) {
  const s = sanitizePhoneInput(raw);
  if (s.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(s);
  return /^[6-9]\d{9}$/.test(s);
}

// Kept under the old name so existing call sites keep working; it now accepts
// international numbers too.
export const isValidIndianMobile = isValidPhone;

export const PHONE_HINT = "Enter a valid mobile number — 10-digit Indian, or with country code (e.g. +44 7911 123456).";

// Digits-only number for https://wa.me/<number>: Indian 10-digit numbers get 91 added.
export function whatsappNumber(raw) {
  const s = sanitizePhoneInput(raw);
  if (!s) return "";
  return s.startsWith("+") ? s.slice(1) : "91" + s;
}

// Legacy Indian phone validation (accepts landline + various formats).
// Kept for backward compatibility — prefer isValidIndianMobile for mobile fields.
export function isValidIndianPhone(raw) {
  const s = normalizePhone(raw);
  if (!s) return false;
  if (/^\+91[6-9]\d{9}$/.test(s)) return true;
  if (/^91[6-9]\d{9}$/.test(s)) return true;
  if (/^0[6-9]\d{9}$/.test(s)) return true;
  if (/^[6-9]\d{9}$/.test(s)) return true;
  // Landline: 0 + 10-11 more digits (STD codes are 2-4 digits)
  if (/^0\d{10,11}$/.test(s)) return true;
  return false;
}

export function isValidEmail(email) {
  if (!email) return false;
  return isStrictEmail(sanitizeEmailInput(email));
}

// ─── Disposable / Temporary Email Blocking ───────────────────────────
// Comprehensive list of known disposable email domains. Registration
// with any of these domains is blocked to prevent abuse.
const DISPOSABLE_DOMAINS = new Set([
  // Major providers
  "mailinator.com", "yopmail.com", "guerrillamail.com", "guerrillamailblock.com",
  "sharklasers.com", "guerrillamail.info", "guerrillamail.net", "guerrillamail.biz",
  "guerrillamail.org", "guerrillamail.de", "spam4.me", "grr.la",
  "10minutemail.com", "10minutemail.org", "10minutemail.net", "10minutemail.info",
  "10minutemail.biz", "10minutemail.co.uk", "10minutemail.de", "10minutemail.fr",
  "temp-mail.org", "temp-mail.com", "temp-mail.io", "tempmail.net", "tempmail.com",
  "tempmail.de", "tempmailo.com", "tempmailaddress.com", "tempmailaddress.net",
  "tempinbox.com", "tempinbox.co.uk", "tempinbox.co", "tempinbox.net",
  "throwawaymail.com", "throwawaymail.net", "throwawaymail.org", "throwawaymail.info",
  "throwaway.email", "throwawaymailaddress.com", "throwawaymailaddress.net",
  "trashmail.com", "trashmail.net", "trashmail.org", "trashmail.info",
  "trashmail.biz", "trashmail.de", "trashmail.me", "trashmail.es",
  "trashmail.fr", "trashmail.it", "trashmail.pl", "trashmail.se",
  "maildrop.cc", "maildrop.net", "maildrop.org", "maildrop.com",
  "disposablemail.com", "disposablemail.net", "disposablemail.org",
  "disposable-email.com", "disposableemail.com", "disposableemail.net",
  "fakeinbox.com", "fakeinbox.net", "fakeinbox.org", "fakeinbox.info",
  "fakeinbox.de", "fakeinbox.co.uk", "fakeinbox.co",
  "mailnesia.com", "mailnesia.net", "mailnesia.org",
  "mintemail.com", "mintemail.net", "mintemail.org",
  "getnada.com", "getnada.net", "getnada.org", "nada.email", "nada.ltd",
  "mohmal.com", "mohmal.net", "mohmal.org",
  "emailondeck.com", "emailondeck.net", "emailondeck.org",
  "mytemp.email", "mytempemail.com", "mytempemail.net",
  "tempemail.com", "tempemail.net", "tempemail.org", "tempemail.info",
  "burnermail.com", "burnermail.net", "burnermail.io",
  "incognitomail.com", "incognitomail.net", "incognitomail.org",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "anonbox.net", "anonbox.org", "anonbox.com",
  "discard.email", "discardmail.com", "discardmail.net", "discardmail.org",
  "dropmail.me", "dropmail.net", "dropmail.org", "dropmail.com",
  "fakemail.com", "fakemail.net", "fakemail.org", "fakemail.info",
  "fastmail.fm", "hushmail.com", "hush.ai",
  "mailinator.net", "mailinator.org", "mailinator.info",
  "mailinator.biz", "mailinator.co.uk", "mailinator.de",
  "mailinator.fr", "mailinator.it", "mailinator.pl",
  "mailinator.se", "mailinator.es", "mailinator2.com",
  "mailinator3.com", "mailinator4.com", "mailinator5.com",
  "mailinator6.com", "mailinator7.com", "mailinator8.com",
  "mailinator9.com",
  "yopmail.net", "yopmail.org", "yopmail.info", "yopmail.biz",
  "yopmail.co.uk", "yopmail.de", "yopmail.fr", "yopmail.it",
  "yopmail.pl", "yopmail.se", "yopmail.es",
  "yopmail.fr.nf", "yopmail.cf", "yopmail.ga", "yopmail.gq", "yopmail.ml",
  "mailinator.cf", "mailinator.ga", "mailinator.gq", "mailinator.ml",
  "guerrillamail.cf", "guerrillamail.ga", "guerrillamail.gq", "guerrillamail.ml",
  "10minutemail.cf", "10minutemail.ga", "10minutemail.gq", "10minutemail.ml",
  "temp-mail.cf", "temp-mail.ga", "temp-mail.gq", "temp-mail.ml",
  // Additional common ones
  "emailfake.com", "emailfake.net", "emailfake.org",
  "fake-mail.com", "fake-mail.net", "fake-mail.org",
  "mailfake.com", "mailfake.net", "mailfake.org",
  "moakt.com", "moakt.net", "moakt.org", "moakt.ws",
  "tmail.ws", "tmails.net",
  "mytemp.email", "mytempemail.com",
  "cool.fr.nf", "yopmail.fr.nf", "courriel.fr.nf", "moncourrier.fr.nf",
  "amilegit.com", "armyspy.com", "cuvox.com", "dayrep.com",
  "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.com",
  "hiphopmail.com", "mytrashmail.com",
  "mt2015.com", "mt2016.com", "mt2017.com", "mt2018.com",
  "mt2019.com", "mt2020.com", "mt2021.com", "mt2022.com",
  "mt2023.com", "mt2024.com", "mt2025.com", "mt2026.com",
]);

// Check if an email uses a disposable/temporary domain.
// Also checks parent domains (e.g. sub.mailinator.com → mailinator.com).
export function isDisposableEmail(email) {
  if (!email) return false;
  const domain = String(email).trim().toLowerCase().split("@")[1];
  if (!domain) return false;

  // Direct match
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Check parent domains (sub.domain.com → domain.com)
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (DISPOSABLE_DOMAINS.has(parent)) return true;
  }

  return false;
}

// Combined email validation: valid format AND not disposable.
export function isValidRegistrationEmail(email) {
  if (!isValidEmail(email)) return false;
  if (isDisposableEmail(email)) return false;
  return true;
}
// Email input cleanup: drop whitespace, zero-width/invisible chars and anything
// that can't appear in an address, and lowercase it. Handles pasted "mailto:",
// "<a@b.com>" wrappers and autofill artefacts.
export function sanitizeEmailInput(val) {
  if (!val) return "";
  return String(val)
    .replace(/^mailto:/i, "")
    .replace(/[^A-Za-z0-9@._%+\-]/g, "")
    .toLowerCase()
    .slice(0, 254);
}

// Strict email check for sanitized input: single @, sane local part and a
// dotted domain with an alphabetic TLD, no leading/trailing/double dots.
export function isStrictEmail(email) {
  const s = String(email || "");
  if (s.length > 254 || s.split("@").length !== 2) return false;
  if (/\.\./.test(s)) return false;
  return /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(s);
}
