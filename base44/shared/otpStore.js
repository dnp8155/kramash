// OTP store — simple in-memory with TTL. For production scale, swap with a persistent store.
const store = new Map(); // key -> { otp, expiresAt, attempts }

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

export function generateOtp(length = 6) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export function setOtp(key, otp, ttlMs = TTL_MS) {
  store.set(key, { otp, expiresAt: Date.now() + ttlMs, attempts: 0 });
}

export function verifyOtp(key, otp) {
  const entry = store.get(key);
  if (!entry) return { valid: false, reason: "not_found" };
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { valid: false, reason: "expired" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { valid: false, reason: "max_attempts" };
  }
  entry.attempts += 1;
  if (entry.otp !== otp) {
    return { valid: false, reason: "mismatch" };
  }
  store.delete(key);
  return { valid: true };
}

export function clearOtp(key) {
  store.delete(key);
}