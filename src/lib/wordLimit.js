// Word limit utility — counts words in plain text or rich text (HTML) strings.

export const WORD_LIMIT = 140;
export const WORD_LIMIT_WARN_THRESHOLD = 130;

// Strip HTML tags and HTML entities, then count whitespace-separated words.
export function countWords(str) {
  if (!str || typeof str !== "string") return 0;
  const plain = str
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .trim();
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function isWithinLimit(str, max = WORD_LIMIT) {
  return countWords(str) <= max;
}