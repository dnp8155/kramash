// Portal crypto helpers — token generation and verification.
import crypto from "crypto";

export function generatePublicToken(byteLength = 24) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function hashToken(token, salt = "kramasha-portal") {
  return crypto.createHash("sha256").update(`${salt}:${token}`).digest("hex");
}