// Shared retry wrapper for transient API errors (429 rate limit, 503 service unavailable).
// Uses exponential backoff: 1s, 2s, 4s. Max 3 retries.
// Only retries on 429/503; all other errors throw immediately.

const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function extractStatus(err) {
  return (
    err?.status ||
    err?.statusCode ||
    err?.response?.status ||
    err?.data?.status ||
    err?.data?.statusCode ||
    null
  );
}

function isRetryableError(err) {
  const status = extractStatus(err);
  if (status && RETRYABLE_STATUS.has(status)) return true;
  // Fallback: check error message for rate-limit / service-unavailable indicators
  const msg = String(err?.message || err?.data?.message || "").toLowerCase();
  if (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded")
  ) {
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(fn, { maxRetries = MAX_RETRIES, baseDelay = BASE_DELAY_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}