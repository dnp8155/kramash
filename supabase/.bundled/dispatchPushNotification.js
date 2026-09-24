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
function derToRaw(der) {
  let offset = 0;
  if (der[offset++] !== 48) throw new Error("Invalid DER: expected SEQUENCE");
  offset++;
  if (der[offset++] !== 2) throw new Error("Invalid DER: expected INTEGER");
  const rLen = der[offset++];
  const r = der.slice(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 2) throw new Error("Invalid DER: expected INTEGER");
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

// supabase/functions/_shared/webPushCrypto.ts
async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}
async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}
async function hkdfExpand(prk, info, length) {
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  const okm = new Uint8Array(n * hashLen);
  let prev = new Uint8Array(0);
  for (let i = 0; i < n; i++) {
    const input = new Uint8Array(prev.length + info.length + 1);
    input.set(prev, 0);
    input.set(info, prev.length);
    input[prev.length + info.length] = i + 1;
    prev = await hmacSha256(prk, input);
    okm.set(prev, i * hashLen);
  }
  return okm.slice(0, length);
}
async function generateEcdhKeyPair() {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pubKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  return { publicKeyUncompressed: pubKeyRaw, privateKey: keyPair.privateKey };
}
function p256dhToJwk(p256dhBase64url) {
  const pubKeyBytes = base64urlDecode(p256dhBase64url);
  const x = base64urlEncode(pubKeyBytes.slice(1, 33));
  const y = base64urlEncode(pubKeyBytes.slice(33, 65));
  return { kty: "EC", crv: "P-256", x, y };
}
function vapidKeysToJwk(privateKeyBase64url, publicKeyBase64url) {
  const pubKeyBytes = base64urlDecode(publicKeyBase64url);
  const x = base64urlEncode(pubKeyBytes.slice(1, 33));
  const y = base64urlEncode(pubKeyBytes.slice(33, 65));
  return { kty: "EC", crv: "P-256", d: privateKeyBase64url, x, y };
}
async function createVapidJwt(params) {
  const { endpoint, vapidPrivateKey, vapidPublicKey, subject } = params;
  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;
  const jwk = vapidKeysToJwk(vapidPrivateKey, vapidPublicKey);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1e3) + 12 * 60 * 60, sub: subject };
  const encHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;
  const derSignature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  const rawSignature = derToRaw(new Uint8Array(derSignature));
  const encSignature = base64urlEncode(rawSignature);
  return `${encHeader}.${encPayload}.${encSignature}`;
}
async function encryptPushPayload(params) {
  const { subscription, payload } = params;
  const p256dh = subscription.keys.p256dh;
  const authSecret = base64urlDecode(subscription.keys.auth);
  const subscriberPubJwk = p256dhToJwk(p256dh);
  const subscriberPubBytes = base64urlDecode(p256dh);
  const { publicKeyUncompressed: ephPub, privateKey: ephPrivKey } = await generateEcdhKeyPair();
  const subscriberPubKey = await crypto.subtle.importKey("jwk", subscriberPubJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberPubKey }, ephPrivKey, 256));
  const prk = await hkdfExtract(authSecret, ecdhSecret);
  const webPushInfo = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(webPushInfo.length + 65 + 65);
  keyInfo.set(webPushInfo, 0);
  keyInfo.set(ephPub, webPushInfo.length);
  keyInfo.set(subscriberPubBytes, webPushInfo.length + 65);
  const cek = await hkdfExpand(prk, keyInfo, 16);
  const nonce = await hkdfExpand(prk, keyInfo, 12);
  const plaintext = new TextEncoder().encode(payload);
  const paddedPlaintext = new Uint8Array(plaintext.length + 1);
  paddedPlaintext.set(plaintext, 0);
  paddedPlaintext[plaintext.length] = 2;
  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, paddedPlaintext));
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const rs = new Uint8Array([0, 0, 16, 0]);
  const idlen = new Uint8Array([65]);
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header.set(rs, 16);
  header.set(idlen, 20);
  header.set(ephPub, 21);
  const message = new Uint8Array(header.length + ciphertext.length);
  message.set(header, 0);
  message.set(ciphertext, header.length);
  return message;
}

// supabase/functions/dispatchPushNotification/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { userId, title, content, data, tag } = body;
    if (!userId || !title || !content) return Response.json({ error: "userId, title, and content are required" }, { status: 400 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (userId !== user.id && profile?.role !== "admin") {
      return Response.json({ error: "Forbidden: can only send to yourself" }, { status: 403 });
    }
    const { data: subscriptions } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", userId);
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@kramasha.app";
    let sent = 0, failed = 0;
    const payload = JSON.stringify({ title, body: content, data: data || {}, tag: tag || "kramasha-notification" });
    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      for (const sub of subscriptions) {
        if (sub.platform !== "web" || !sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
        try {
          const encrypted = await encryptPushPayload({
            subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            payload
          });
          const vapidJwt = await createVapidJwt({ endpoint: sub.endpoint, vapidPrivateKey, vapidPublicKey, subject: vapidSubject });
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: { Authorization: `vapid t=${vapidJwt},k=${vapidPublicKey}`, TTL: "86400", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" },
            body: encrypted
          });
          if (response.ok || response.status === 201) sent++;
          else if (response.status === 404 || response.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            failed++;
          } else failed++;
        } catch {
          failed++;
        }
      }
    }
    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
