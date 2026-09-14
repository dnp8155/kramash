import { secrets } from "base44:runtime";

// ===== base64url utilities =====

export function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ===== CBOR decoder =====

export function decodeCbor(data, startOffset) {
  let offset = startOffset;
  const firstByte = data[offset++];
  const majorType = firstByte >> 5;
  const ai = firstByte & 0x1f;

  let length;
  if (ai < 24) {
    length = ai;
  } else if (ai === 24) {
    length = data[offset++];
  } else if (ai === 25) {
    length = (data[offset++] << 8) | data[offset++];
  } else if (ai === 26) {
    length =
      (data[offset++] << 24) | (data[offset++] << 16) | (data[offset++] << 8) | data[offset++];
  } else if (ai === 27) {
    length = 0;
    for (let i = 0; i < 8; i++) {
      length = length * 256 + data[offset++];
    }
  } else {
    throw new Error("Unsupported CBOR additional info: " + ai);
  }

  switch (majorType) {
    case 0:
      return { value: length, offset };
    case 1:
      return { value: -1 - length, offset };
    case 2: {
      const result = data.slice(offset, offset + length);
      offset += length;
      return { value: result, offset };
    }
    case 3: {
      const result = new TextDecoder().decode(data.slice(offset, offset + length));
      offset += length;
      return { value: result, offset };
    }
    case 4: {
      const arr = [];
      for (let i = 0; i < length; i++) {
        const decoded = decodeCbor(data, offset);
        arr.push(decoded.value);
        offset = decoded.offset;
      }
      return { value: arr, offset };
    }
    case 5: {
      const map = {};
      for (let i = 0; i < length; i++) {
        const keyDecoded = decodeCbor(data, offset);
        offset = keyDecoded.offset;
        const valDecoded = decodeCbor(data, offset);
        offset = valDecoded.offset;
        map[String(keyDecoded.value)] = valDecoded.value;
      }
      return { value: map, offset };
    }
    case 7:
      if (ai === 20) return { value: false, offset };
      if (ai === 21) return { value: true, offset };
      if (ai === 22) return { value: null, offset };
      if (ai === 23) return { value: undefined, offset };
      return { value: length, offset };
    default:
      throw new Error("Unknown CBOR major type: " + majorType);
  }
}

// ===== RP ID and Origin =====

export function getRpId(req) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    // ignore
  }
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
  return host.split(",")[0].trim();
}

export function getOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer") || "";
  try {
    return new URL(referer).origin;
  } catch {
    // ignore
  }
  const host = req.headers.get("host") || "";
  if (host) return `https://${host}`;
  return "";
}

// ===== Challenge generation =====

export function generateChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// ===== Challenge token (stateless, HMAC-signed with BASE44_APP_ID) =====

export async function createChallengeToken(challenge, userId) {
  const payload = {
    challenge: base64urlEncode(challenge),
    userId,
    exp: Date.now() + 5 * 60 * 1000,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = base64urlEncode(payloadBytes);

  const appKey = secrets.get("BASE44_APP_ID") || "fallback-key";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64urlEncode(new Uint8Array(sig));

  return `${payloadB64}.${sigB64}`;
}

export async function verifyChallengeToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid challenge token format");
  const [payloadB64, sigB64] = parts;

  const appKey = secrets.get("BASE44_APP_ID") || "fallback-key";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(sigB64),
    new TextEncoder().encode(payloadB64)
  );

  if (!isValid) throw new Error("Invalid challenge token signature");

  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  if (Date.now() > payload.exp) throw new Error("Challenge token expired");

  return payload;
}

// ===== COSE key to JWK =====

function coseToJwk(coseKey) {
  const kty = coseKey["1"];
  const crv = coseKey["-1"];
  const x = coseKey["-2"];
  const y = coseKey["-3"];

  if (kty !== 2 || crv !== 1) {
    throw new Error("Unsupported COSE key type or curve: kty=" + kty + " crv=" + crv);
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: base64urlEncode(x),
    y: base64urlEncode(y),
  };
}

// ===== AuthData parsing =====

export function parseAuthData(authData) {
  if (authData.length < 37) {
    throw new Error("authData too short");
  }
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const counter =
    (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];

  const result = { rpIdHash, flags, counter, credentialId: null, credentialPublicKeyJwk: null };

  if (flags & 0x40) {
    let offset = 37;
    offset += 16; // AAGUID
    const credIdLen = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    result.credentialId = authData.slice(offset, offset + credIdLen);
    offset += credIdLen;
    const { value: coseKey } = decodeCbor(authData, offset);
    result.credentialPublicKeyJwk = coseToJwk(coseKey);
  }

  return result;
}

// ===== ECDSA signature conversion =====

export function rawToDer(raw) {
  function toDerInt(bytes) {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    let trimmed = bytes.slice(start);
    if (trimmed[0] & 0x80) {
      const padded = new Uint8Array(trimmed.length + 1);
      padded.set(trimmed, 1);
      trimmed = padded;
    }
    return trimmed;
  }

  const r = toDerInt(raw.slice(0, 32));
  const s = toDerInt(raw.slice(32, 64));
  const totalLen = 2 + r.length + 2 + s.length;

  const result = new Uint8Array(2 + totalLen);
  let offset = 0;
  result[offset++] = 0x30;
  result[offset++] = totalLen;
  result[offset++] = 0x02;
  result[offset++] = r.length;
  result.set(r, offset);
  offset += r.length;
  result[offset++] = 0x02;
  result[offset++] = s.length;
  result.set(s, offset);

  return result;
}

export function derToRaw(der) {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("Invalid DER: expected SEQUENCE");
  offset++; // total length
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER");
  const rLen = der[offset++];
  const r = der.slice(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER");
  const sLen = der[offset++];
  const s = der.slice(offset, offset + sLen);

  const rBytes = new Uint8Array(32);
  const sBytes = new Uint8Array(32);
  const rData = r.length > 32 ? r.slice(r.length - 32) : r;
  rBytes.set(rData, 32 - rData.length);
  const sData = s.length > 32 ? s.slice(s.length - 32) : s;
  sBytes.set(sData, 32 - sData.length);

  const raw = new Uint8Array(64);
  raw.set(rBytes, 0);
  raw.set(sBytes, 32);
  return raw;
}

// ===== Assertion verification =====

export async function verifyAssertion(params) {
  const {
    authenticatorData,
    clientDataJSON,
    signature,
    storedPublicKeyJwk,
    expectedChallenge,
    expectedOrigin,
    expectedRpId,
    storedCounter,
  } = params;

  // 1. Parse clientDataJSON
  const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

  // 2. Verify type
  if (clientData.type !== "webauthn.get") {
    throw new Error("Invalid clientData type: " + clientData.type);
  }

  // 3. Verify origin
  if (clientData.origin !== expectedOrigin) {
    throw new Error("Origin mismatch: " + clientData.origin + " vs " + expectedOrigin);
  }

  // 4. Verify challenge
  if (clientData.challenge !== expectedChallenge) {
    throw new Error("Challenge mismatch");
  }

  // 5. Verify RP ID hash
  const expectedRpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId))
  );
  const authDataRpIdHash = authenticatorData.slice(0, 32);
  let rpIdMatch = true;
  for (let i = 0; i < 32; i++) {
    if (expectedRpIdHash[i] !== authDataRpIdHash[i]) {
      rpIdMatch = false;
      break;
    }
  }
  if (!rpIdMatch) {
    throw new Error("RP ID hash mismatch");
  }

  // 6. Import public key
  const key = await crypto.subtle.importKey(
    "jwk",
    storedPublicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  // 7. Compute signed data
  const clientDataHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientDataJSON));
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signedData.set(authenticatorData, 0);
  signedData.set(clientDataHash, authenticatorData.length);

  // 8. Convert raw signature to DER
  const derSignature = rawToDer(signature);

  // 9. Verify signature
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    derSignature,
    signedData
  );

  if (!verified) {
    throw new Error("Signature verification failed");
  }

  // 10. Check counter
  const parsed = parseAuthData(authenticatorData);
  const newCounter = parsed.counter;
  if (storedCounter > 0 && newCounter <= storedCounter) {
    throw new Error("Counter not incremented — possible cloned authenticator");
  }

  return { verified: true, newCounter };
}