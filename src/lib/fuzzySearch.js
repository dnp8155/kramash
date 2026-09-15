// Lightweight fuzzy search engine — vanilla JS, no external deps.
// Scoring combines subsequence bonus (consecutive chars, prefix, density)
// with a Levenshtein-distance penalty for typo tolerance.

// Normalize: lowercase + strip diacritics + collapse whitespace.
export function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Classic iterative Levenshtein distance with a rolling two-row buffer.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Subsequence match: does every char of `query` appear in `text` in order?
// Returns { matched, consecutive, prefixBonus, matchDensity } or null.
function subsequenceMatch(query, text) {
  if (!query) return { matched: true, consecutive: 0, prefixBonus: 0, matchDensity: 0 };
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let run = 0;
  let firstMatchIndex = -1;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      if (firstMatchIndex === -1) firstMatchIndex = ti;
      lastMatchIndex = ti;
      run++;
      consecutive++;
      if (run > maxConsecutive) maxConsecutive = run;
      qi++;
    } else {
      run = 0;
    }
  }

  if (qi < query.length) return null; // not all query chars matched

  const prefixBonus = firstMatchIndex === 0 ? 1 : 0;
  const matchDensity = lastMatchIndex > firstMatchIndex
    ? query.length / (lastMatchIndex - firstMatchIndex + 1)
    : 1;

  return { matched: true, consecutive: maxConsecutive, prefixBonus, matchDensity };
}

// Score a single candidate string against the query. Higher = better.
// Returns 0..1 normalized score, or 0 if below threshold.
export function fuzzyScore(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;

  // Exact / substring match — strong signal.
  if (c === q) return 1;
  if (c.includes(q)) {
    // Reward short candidates and early matches.
    const positionBonus = 1 - (c.indexOf(q) / Math.max(c.length, 1)) * 0.3;
    return Math.min(0.98, 0.85 + positionBonus * 0.13);
  }

  // Word-start matching: query matches beginning of a word.
  const words = c.split(" ");
  for (const w of words) {
    if (w.startsWith(q)) return Math.min(0.95, 0.8 + (q.length / Math.max(w.length, 1)) * 0.15);
  }

  // Subsequence match with typo tolerance.
  const sub = subsequenceMatch(q, c);
  if (!sub) {
    // Fall back to Levenshtein-only for short queries with typos.
    const dist = levenshtein(q, c.slice(0, Math.min(c.length, q.length + 2)));
    const similarity = 1 - dist / Math.max(q.length, c.length);
    return similarity > 0.6 ? similarity * 0.5 : 0;
  }

  // Levenshtein against the full candidate (penalizes very different lengths).
  const dist = levenshtein(q, c.slice(0, Math.min(c.length, q.length + 3)));
  const lenSim = 1 - dist / Math.max(q.length, c.length);

  // Weighted blend: subsequence structure + prefix + density - length penalty.
  const score =
    0.4 * (sub.consecutive / q.length) +
    0.2 * sub.prefixBonus +
    0.25 * sub.matchDensity +
    0.15 * lenSim;

  return Math.max(0, Math.min(0.89, score));
}

// Rank an array of items by fuzzy score against the query.
// `getText` extracts the searchable string from each item.
// `threshold` drops weak matches (default 0.3).
// Returns items sorted by score desc, each annotated with `_score`.
export function fuzzyRank(items, query, getText, threshold = 0.3, limit = 5) {
  if (!query || !items) return [];
  const scored = items
    .map((item) => {
      const text = getText(item) || "";
      const primary = fuzzyScore(query, text);
      // Also consider secondary fields if item has extra searchable text.
      const secondary = item._searchText ? fuzzyScore(query, item._searchText) * 0.7 : 0;
      const score = Math.max(primary, secondary);
      return { item, score };
    })
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ ...r.item, _score: r.score }));
  return scored;
}