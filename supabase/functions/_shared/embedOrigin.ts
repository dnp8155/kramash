// Which websites may show a business's embedded inquiry form: only the business's own website (the one in its
// business details). Pure functions, no Deno imports, so the tests can run them directly.

// "https://www.Shah-Photo.com/contact" and "shah-photo.com" both become "shah-photo.com". Anything that isn't a
// plain web address (javascript:, "null" from a sandboxed frame, empty) becomes "".
export function hostKey(value: unknown): string {
  let v = String(value ?? "").trim().toLowerCase();
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// The business's own website(s): the website in its business details (several may be listed, separated by spaces,
// commas or new lines) plus any extra addresses it added for the form (an alias domain, a booking site...).
export function allowedHosts(website: unknown, extra?: unknown): string[] {
  const parts = [website, extra].flatMap((v) => String(v ?? "").split(/[\s,;]+/));
  return [...new Set(parts.map(hostKey).filter(Boolean))];
}

// The address itself or any of its subdomains: shah-photo.com covers www., blog. and booking.shah-photo.com, but not
// evilshah-photo.com or shah-photo.com.evil.com.
function hostMatches(host: string, site: string): boolean {
  return !!host && (host === site || host.endsWith("." + site));
}

// Opened on its own (not inside another page) is fine: that is just viewing the form. Inside a page, the TOP page (the
// last one listed, the one in the address bar) must be the business's own website. Frames in between may be anything:
// website builders show an "embed code" block inside their own frame, and those frames sit inside the business's page.
// A page above that belongs to someone else would be the top, so it is still refused. selfHost is the app itself, which
// may show its own form (the preview in My Profile). An unknown parent counts as not allowed.
export function isEmbedAllowed(website: unknown, framed: boolean, ancestors: unknown, extra?: unknown, selfHost?: unknown): boolean {
  if (!framed) return true;
  const list = Array.isArray(ancestors) ? ancestors.slice(0, 10) : [];
  if (list.length === 0) return false;
  const top = hostKey(list[list.length - 1]);
  if (!top || top === "null") return false;
  const me = hostKey(selfHost);
  if (me && top === me) return true;
  return allowedHosts(website, extra).some((site) => hostMatches(top, site));
}
