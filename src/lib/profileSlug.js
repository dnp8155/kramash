// Public profile URL (/p/<slug>) rules that are the same for everyone. Enforced in the app only (My Profile).

const RESERVED_WORDS = new Set([
  "anon", "anonymous", "unknown", "null", "undefined", "none", "untitled", "guest", "default",
  "admin", "administrator", "root", "system", "support", "help", "official", "api", "app", "www", "profile",
  "test", "demo", "sample", "example",
  "yourbusiness", "mybusiness", "businessname", "yourname",
]);
// Anything containing the app's own name could pass for Kramasha itself.
const BRAND_PARTS = ["kramash", "kramsha"];

// "anon-123", "Un-known" and "admin2" all count as the word they spell once digits and hyphens are ignored.
export function isReservedSlug(slug) {
  const key = String(slug || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return false;
  return RESERVED_WORDS.has(key) || BRAND_PARTS.some((b) => key.includes(b));
}
