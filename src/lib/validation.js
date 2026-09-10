// Shared validation helpers for contact fields.

// Strip spaces, dashes, parentheses — keep digits and a leading +.
export function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).trim().replace(/[\s\-()]/g, "");
}

// Indian phone validation.
// Accepts:
//   +91XXXXXXXXXX  (with country code)
//   91XXXXXXXXXX   (country code without +)
//   0XXXXXXXXXX    (0 prefix — mobile or landline)
//   XXXXXXXXXX     (10-digit mobile starting 6-9)
//   0 + STD + number (landline, 11-12 digits)
// Rejects garbage like "123548790" (starts with 1, too short, etc.)
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}