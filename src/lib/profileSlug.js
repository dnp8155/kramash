// Public profile URL (/p/<slug>) rules that are the same for everyone. Enforced in the app only (My Profile), and
// only while a URL can still be chosen: a URL that is already saved (locked) is never re-checked, so existing
// profiles keep working.

const RESERVED_WORDS = new Set([
  "anon", "anonymous", "unknown", "null", "undefined", "none", "untitled", "guest", "default",
  "admin", "administrator", "root", "system", "support", "help", "official", "api", "app", "www", "profile",
  "test", "demo", "sample", "example",
  "yourbusiness", "mybusiness", "businessname", "yourname",
]);

// Anything containing the app's own name (any prefix or suffix, common misspellings) could pass for Kramasha itself.
const BRAND_PARTS = ["kramash", "kramsha", "kramasa", "krmasha", "kramaasha", "kramasah"];

// Big companies (tech, AI, payments, social, large Indian groups). Distinctive names are blocked anywhere in the
// URL ("google-studio", "mygooglephotos") — they don't hide inside ordinary words.
const BIG_BRANDS_ANYWHERE = [
  "google", "alphabet", "youtube", "gmail", "android",
  "microsoft", "linkedin", "github", "copilot",
  "amazon", "primevideo",
  "facebook", "instagram", "whatsapp",
  "twitter", "netflix", "spotify", "tiktok", "snapchat", "telegram", "pinterest", "reddit", "discord",
  "tesla", "spacex", "nvidia", "samsung", "qualcomm", "adobe", "salesforce", "oracle",
  "openai", "chatgpt", "anthropic", "deepmind", "perplexity", "midjourney", "huggingface", "deepseek",
  "paypal", "razorpay", "paytm", "phonepe", "googlepay", "mastercard", "americanexpress",
  "flipkart", "myntra", "swiggy", "zomato", "airbnb",
  "infosys", "airtel", "vodafone", "byjus",
  "disney", "hotstar", "fujifilm", "godaddy", "shopify", "yahoo",
];
// Short names, and names that are also ordinary words or surnames, only count as a whole word between hyphens
// ("apple-studio", "meta", "intel-photos"), so "pineapple-events", "metal-art", "alexander-films", "canvas-prints",
// "intelligent-design" or "studio-x" stay allowed. Everyday words (threads, zoom, booking…) are left out on purpose.
// Only blocked as the WHOLE URL: "x".
const BIG_BRANDS_EXACT = new Set(["x", "mi", "twitterx"]);
const BIG_BRANDS_AS_WORD = new Set([
  "apple", "meta", "claude", "gemini", "bard", "grok", "mistral", "xai", "bing", "ibm", "hp", "dell", "lenovo", "asus",
  "aws", "alexa", "xbox", "intel", "cisco", "stripe", "visa", "amex", "gpay", "bhim",
  "uber", "ola", "sony", "canon", "nikon", "canva", "wix", "zoho",
  "tata", "tcs", "hcl", "wipro", "reliance", "adani", "mahindra", "jio", "infy",
  "lg", "xiaomi", "oneplus", "vivo", "oppo", "realme", "nokia",
]);

// "anon-123", "Un-known" and "admin2" all count as the word they spell once digits and hyphens are ignored.
export function isReservedSlug(slug) {
  const raw = String(slug || "").toLowerCase();
  const key = raw.replace(/[^a-z]/g, "");
  if (!key) return false;
  if (RESERVED_WORDS.has(key) || BRAND_PARTS.some((b) => key.includes(b))) return true;
  if (BIG_BRANDS_ANYWHERE.some((b) => key.includes(b))) return true;
  // Whole words between hyphens (digits ignored): "apple-studio", "meta2", "aws-photos".
  const words = raw.split("-").map((w) => w.replace(/[^a-z]/g, "")).filter(Boolean);
  return BIG_BRANDS_EXACT.has(key) || words.some((w) => BIG_BRANDS_AS_WORD.has(w)) || BIG_BRANDS_AS_WORD.has(key);
}
