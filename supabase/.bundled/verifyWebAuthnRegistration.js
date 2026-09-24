// supabase/functions/_shared/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders
      });
    }
    const response = await handler(req);
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
var supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
async function getUserFromRequest(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// supabase/functions/_shared/webauthnCore.ts
function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function decodeCbor(data, startOffset) {
  let offset = startOffset;
  const firstByte = data[offset++];
  const majorType = firstByte >> 5;
  const ai = firstByte & 31;
  let length;
  if (ai < 24) {
    length = ai;
  } else if (ai === 24) {
    length = data[offset++];
  } else if (ai === 25) {
    length = data[offset++] << 8 | data[offset++];
  } else if (ai === 26) {
    length = data[offset++] << 24 | data[offset++] << 16 | data[offset++] << 8 | data[offset++];
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
      if (ai === 23) return { value: void 0, offset };
      return { value: length, offset };
    default:
      throw new Error("Unknown CBOR major type: " + majorType);
  }
}
function getRpId(req) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  try {
    return new URL(origin).hostname;
  } catch {
  }
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
  return host.split(",")[0].trim();
}
function getOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer") || "";
  try {
    return new URL(referer).origin;
  } catch {
  }
  const host = req.headers.get("host") || "";
  if (host) return `https://${host}`;
  return "";
}
async function verifyChallengeToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid challenge token format");
  const [payloadB64, sigB64] = parts;
  const appKey = Deno.env.get("BASE44_APP_ID") || Deno.env.get("APP_SECRET") || "fallback-key";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const isValid = await crypto.subtle.verify("HMAC", key, base64urlDecode(sigB64), new TextEncoder().encode(payloadB64));
  if (!isValid) throw new Error("Invalid challenge token signature");
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  if (Date.now() > payload.exp) throw new Error("Challenge token expired");
  return payload;
}
function coseToJwk(coseKey) {
  const kty = coseKey["1"];
  const crv = coseKey["-1"];
  const x = coseKey["-2"];
  const y = coseKey["-3"];
  if (kty !== 2 || crv !== 1) {
    throw new Error("Unsupported COSE key type or curve: kty=" + kty + " crv=" + crv);
  }
  return { kty: "EC", crv: "P-256", x: base64urlEncode(x), y: base64urlEncode(y) };
}
function parseAuthData(authData) {
  if (authData.length < 37) throw new Error("authData too short");
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const counter = authData[33] << 24 | authData[34] << 16 | authData[35] << 8 | authData[36];
  const result = { rpIdHash, flags, counter, credentialId: null, credentialPublicKeyJwk: null };
  if (flags & 64) {
    let offset = 37;
    offset += 16;
    const credIdLen = authData[offset] << 8 | authData[offset + 1];
    offset += 2;
    result.credentialId = authData.slice(offset, offset + credIdLen);
    offset += credIdLen;
    const { value: coseKey } = decodeCbor(authData, offset);
    result.credentialPublicKeyJwk = coseToJwk(coseKey);
  }
  return result;
}

// supabase/functions/verifyWebAuthnRegistration/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { credential, challengeToken, deviceLabel } = body;
    if (!credential || !challengeToken) return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });
    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;
    const attestationObject = base64urlDecode(credential.response.attestationObject);
    const clientDataJSON = base64urlDecode(credential.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
    if (clientData.type !== "webauthn.create") return Response.json({ error: "Invalid clientData type: " + clientData.type }, { status: 400 });
    const expectedOrigin = getOrigin(req);
    if (clientData.origin !== expectedOrigin) return Response.json({ error: "Origin mismatch" }, { status: 400 });
    if (clientData.challenge !== expectedChallenge) return Response.json({ error: "Challenge mismatch" }, { status: 400 });
    const { value: attObj } = decodeCbor(attestationObject, 0);
    const authData = attObj.authData;
    const expectedRpId = getRpId(req);
    const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId)));
    const authDataRpIdHash = authData.slice(0, 32);
    let rpIdMatch = true;
    for (let i = 0; i < 32; i++) {
      if (expectedRpIdHash[i] !== authDataRpIdHash[i]) {
        rpIdMatch = false;
        break;
      }
    }
    if (!rpIdMatch) return Response.json({ error: "RP ID hash mismatch" }, { status: 400 });
    const parsed = parseAuthData(authData);
    if (!parsed.credentialId || !parsed.credentialPublicKeyJwk) return Response.json({ error: "No attested credential data in authData" }, { status: 400 });
    const credentialIdB64 = base64urlEncode(parsed.credentialId);
    const publicKeyJwkStr = JSON.stringify(parsed.credentialPublicKeyJwk);
    const { data: existing } = await supabaseAdmin.from("user_auth_credentials").select("id").eq("user_id", user.id).eq("credential_id", credentialIdB64);
    if (existing && existing.length > 0) return Response.json({ error: "Credential already registered" }, { status: 409 });
    const { data: created } = await supabaseAdmin.from("user_auth_credentials").insert({
      user_id: user.id,
      credential_id: credentialIdB64,
      public_key: publicKeyJwkStr,
      counter: parsed.counter,
      device_label: deviceLabel || "Device",
      transports: credential.response.transports ? JSON.stringify(credential.response.transports) : ""
    }).select("*").single();
    await supabaseAdmin.from("profiles").update({ app_lock_enabled: true }).eq("id", user.id);
    return Response.json({ verified: true, credentialId: credentialIdB64, credential: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
