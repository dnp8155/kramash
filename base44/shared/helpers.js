// Shared helpers — pure functions used across multiple backend functions.

export function safeJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
}

export function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function filterTeamItems(items) {
  return (items || []).filter((it) => it.item_type === "team");
}

export function filterServiceItems(items) {
  return (items || []).filter((it) => it.item_type === "service");
}

export function calculateMilestoneAmount(milestone, grandTotal) {
  const value = Math.max(0, Number(milestone?.value) || 0);
  if (milestone?.type === "fixed") return round2(value);
  return round2((Number(grandTotal) || 0) * value / 100);
}

export function computeExpiry(startDateStr, durationMonths) {
  const d = new Date(startDateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + durationMonths);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().split("T")[0];
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Base64url encode/decode for WebAuthn
export function base64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function generateChallenge() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr;
}

// Simple challenge token: base64url(challenge_hex + ":" + user_id + ":" + expiry)
export async function createChallengeToken(challenge, userId) {
  const expiry = Date.now() + 5 * 60 * 1000;
  const challengeHex = [...new Uint8Array(challenge)].map(b => b.toString(16).padStart(2, "0")).join("");
  const payload = `${challengeHex}:${userId}:${expiry}`;
  return base64urlEncode(new TextEncoder().encode(payload));
}

export async function verifyChallengeToken(token) {
  try {
    const decoded = new TextDecoder().decode(base64urlDecode(token));
    const parts = decoded.split(":");
    if (parts.length < 3) throw new Error("Invalid token format");
    const challengeHex = parts[0];
    const userId = parts.slice(1, -1).join(":");
    const expiry = parseInt(parts[parts.length - 1], 10);
    if (Date.now() > expiry) throw new Error("Challenge token expired");
    const challengeBytes = new Uint8Array(challengeHex.length / 2);
    for (let i = 0; i < challengeBytes.length; i++) {
      challengeBytes[i] = parseInt(challengeHex.substr(i * 2, 2), 16);
    }
    return { challenge: challengeHex, challengeBytes, userId };
  } catch (e) {
    throw new Error("Invalid challenge token: " + e.message);
  }
}

export function getRpId(req) {
  const origin = getOrigin(req);
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch { return null; }
}

export function getOrigin(req) {
  const headers = req.headers || new Headers();
  // Try multiple headers
  return headers.get("origin") || headers.get("referer")?.replace(/\/$/, "") || 
    (headers.get("x-forwarded-proto") || "https") + "://" + (headers.get("x-forwarded-host") || headers.get("host") || "localhost");
}

// Minimal CBOR decoder for WebAuthn attestation objects
export function decodeCbor(buf, offset) {
  // This is a simplified CBOR decoder sufficient for WebAuthn attestation objects
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const result = _decodeCborValue(bytes, offset || 0);
  return result;
}

function _decodeCborValue(bytes, offset) {
  const firstByte = bytes[offset];
  const majorType = firstByte >> 5;
  const info = firstByte & 0x1f;

  if (majorType === 5) { // map
    const mapLength = info === 31 ? -1 : _readLen(bytes, offset, info);
    let pos = offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0);
    const map = {};
    let count = 0;
    while (mapLength === -1 ? bytes[pos] !== 0xff : count < mapLength) {
      if (mapLength === -1 && bytes[pos] === 0xff) { pos++; break; }
      const key = _decodeCborValue(bytes, pos);
      pos = key.offset;
      const val = _decodeCborValue(bytes, pos);
      pos = val.offset;
      map[key.value] = val.value;
      count++;
    }
    return { value: map, offset: pos };
  }
  if (majorType === 3) { // byte string
    const len = _readLen(bytes, offset, info);
    let pos = offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0);
    const value = bytes.slice(pos, pos + len);
    return { value, offset: pos + len };
  }
  if (majorType === 2) { // text string
    const len = _readLen(bytes, offset, info);
    let pos = offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0);
    const value = new TextDecoder().decode(bytes.slice(pos, pos + len));
    return { value, offset: pos + len };
  }
  if (majorType === 0) { // unsigned int
    return { value: _readLen(bytes, offset, info), offset: offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0) };
  }
  if (majorType === 1) { // negative int
    return { value: -1 - _readLen(bytes, offset, info), offset: offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0) };
  }
  if (majorType === 4) { // array
    const len = _readLen(bytes, offset, info);
    let pos = offset + 1 + (info >= 24 ? 1 : 0) + (info >= 256 ? 1 : 0);
    const arr = [];
    for (let i = 0; i < len; i++) {
      const v = _decodeCborValue(bytes, pos);
      pos = v.offset;
      arr.push(v.value);
    }
    return { value: arr, offset: pos };
  }
  return { value: null, offset: offset + 1 };
}

function _readLen(bytes, offset, info) {
  if (info < 24) return info;
  if (info === 24) return bytes[offset + 1];
  if (info === 25) return (bytes[offset + 1] << 8) | bytes[offset + 2];
  if (info === 26) return (bytes[offset + 1] << 24) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 8) | bytes[offset + 4];
  return 0;
}

export function parseAuthData(authData) {
  const bytes = authData instanceof Uint8Array ? authData : new Uint8Array(authData);
  const rpIdHash = bytes.slice(0, 32);
  const flags = bytes[32];
  const counter = ((bytes[33] << 24) | (bytes[34] << 16) | (bytes[35] << 8) | bytes[36]) >>> 0;
  const hasAttested = (flags & 0x40) !== 0;
  let credentialId = null, credentialPublicKeyJwk = null;
  let offset = 37;
  if (hasAttested) {
    const aaguid = bytes.slice(offset, offset + 16);
    offset += 16;
    const credIdLen = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    credentialId = bytes.slice(offset, offset + credIdLen);
    offset += credIdLen;
    // The rest is the CBOR-encoded public key
    const pubKeyBytes = bytes.slice(offset);
    try {
      const { value: pubKey } = decodeCbor(pubKeyBytes, 0);
      if (pubKey) {
        // COSE key to JWK
        const kty = pubKey[1];
        const alg = pubKey[3];
        if (kty === 2) { // EC2
          credentialPublicKeyJwk = {
            kty: "EC",
            crv: "P-256",
            x: base64urlEncode(pubKey[-2]),
            y: base64urlEncode(pubKey[-3]),
            alg: alg || -7
          };
        } else if (kty === 3) { // RSA
          credentialPublicKeyJwk = {
            kty: "RSA",
            n: base64urlEncode(pubKey[-1]),
            e: base64urlEncode(pubKey[-2]),
            alg: alg || -257
          };
        }
      }
    } catch {}
  }
  return { rpIdHash, flags, counter, credentialId, credentialPublicKeyJwk };
}

export async function verifyAssertion(opts) {
  const { authenticatorData, clientDataJSON, signature, storedPublicKeyJwk, expectedChallenge, expectedOrigin, expectedRpId, storedCounter } = opts;

  const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
  if (clientData.type !== "webauthn.get") throw new Error("Invalid clientData type");
  if (clientData.challenge !== expectedChallenge) throw new Error("Challenge mismatch");
  if (clientData.origin !== expectedOrigin) throw new Error("Origin mismatch");

  // Verify RP ID hash
  const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId)));
  const authRpIdHash = authenticatorData.slice(0, 32);
  for (let i = 0; i < 32; i++) {
    if (expectedRpIdHash[i] !== authRpIdHash[i]) throw new Error("RP ID hash mismatch");
  }

  // Verify signature
  const flags = authenticatorData[32];
  const hasUserVerification = (flags & 0x04) !== 0;
  if (!hasUserVerification) throw new Error("User verification required");

  const counter = ((authenticatorData[33] << 24) | (authenticatorData[34] << 16) | (authenticatorData[35] << 8) | authenticatorData[36]) >>> 0;
  if (counter <= storedCounter && counter !== 0) throw new Error("Counter regression detected");

  // Import public key and verify signature
  const keyData = { ...storedPublicKeyJwk, ext: true };
  const cryptoKey = await crypto.subtle.importKey("jwk", keyData, storedPublicKeyJwk.alg === -7 ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signedData = new Uint8Array(authenticatorData.length + clientDataJSON.length);
  signedData.set(authenticatorData, 0);
  signedData.set(clientDataJSON, authenticatorData.length);
  const valid = await crypto.subtle.verify(cryptoKey.algorithm, cryptoKey, signature, signedData);
  if (!valid) throw new Error("Signature verification failed");

  return { newCounter: counter + 1 };
}