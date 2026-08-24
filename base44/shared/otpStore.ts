// Shared OTP store for sendOtp and verifyOtp backend functions.
// In-memory map with expiry — OTPs are never persisted to the database
// and never returned to the client.

export const otpStore = new Map<string, { code: string; expires: number; attempts: number; lastSent: number }>();

export const SEND_COOLDOWN_MS = 30000;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Clean up expired entries (call periodically).
export function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (now > entry.expires) otpStore.delete(phone);
  }
}