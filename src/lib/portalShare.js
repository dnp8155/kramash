// Shared helpers for the "Quick Portal Access" cards (client + team member).

// The text sent to a client / team member: link and password together, so one tap shares everything.
export function buildPortalShareMessage({ name, link, password, kind = "client" }) {
  const lines = [`Hi ${name || ""}`.trim() + ",", "", `Here is your portal link:`, link, "", `Password: ${password}`];
  if (kind === "client") lines.push("", "This one password also opens your quotations and invoices.");
  return lines.join("\n");
}

export function whatsappShareUrl(phone, message) {
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

// "Last changed today" / "yesterday" / "12 Oct 2026".
export function describeChangedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// "46h left" / "2d left" for the old-password grace window; "" when it is over or unset.
export function describeGraceLeft(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (!(ms > 0)) return "";
  const hours = Math.ceil(ms / 3600000);
  return hours >= 48 ? `${Math.ceil(hours / 24)}d left` : `${hours}h left`;
}

// ---- Remembering the password between a client's pages (portal -> quotation) and for admin "Open" ----

// Same-tab memory so a client who unlocked the project portal isn't asked again on the quotation page.
export function rememberLinkPassword(token, password) {
  if (!token || !password) return;
  try { sessionStorage.setItem(`link_pw_${token}`, password); } catch { /* ignore */ }
}

// Admin tapped "Open": hand the password to the new tab once, for two minutes, so the admin isn't asked to
// type the password they are looking at.
export function stashPreviewPassword(token, password) {
  if (!token || !password) return;
  try { localStorage.setItem(`link_pw_preview_${token}`, JSON.stringify({ password, at: Date.now() })); } catch { /* ignore */ }
}

export function recallLinkPassword(token) {
  if (!token) return "";
  try {
    const own = sessionStorage.getItem(`link_pw_${token}`);
    if (own) return own;
    const key = `link_pw_preview_${token}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      localStorage.removeItem(key);
      const { password, at } = JSON.parse(raw);
      if (password && Date.now() - at < 120000) return password;
    }
  } catch { /* ignore */ }
  return "";
}
