/**
 * Simple client-side password hashing for App Lock.
 * Uses SHA-256 via Web Crypto API. This is a privacy lock, not a
 * security vault — it prevents casual access to the app on shared devices.
 */

const SALT = "kramasha_app_lock_v1";

export async function hashPassword(password) {
  if (!password) return "";
  
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(SALT + password);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    console.warn("crypto.subtle is not available. Using fallback hashing.");
    let hash = 0;
    const str = SALT + password;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return "fallback_" + Math.abs(hash).toString(16);
  }
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const enteredHash = await hashPassword(password);
  return enteredHash === storedHash;
}