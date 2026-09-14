import { base64urlEncode, base64urlDecode, derToRaw } from "./webauthnCore.ts";

// ===== HMAC-SHA256 =====

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

// ===== HKDF =====

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

// ===== ECDH =====

async function generateEcdhKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
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

// ===== VAPID JWT =====

export async function createVapidJwt(params) {
  const { endpoint, vapidPrivateKey, vapidPublicKey, subject } = params;

  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;

  const jwk = vapidKeysToJwk(vapidPrivateKey, vapidPublicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const encHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const derSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );
  const rawSignature = derToRaw(new Uint8Array(derSignature));
  const encSignature = base64urlEncode(rawSignature);

  return `${encHeader}.${encPayload}.${encSignature}`;
}

// ===== Web Push Encryption (RFC 8291 / aes128gcm) =====

export async function encryptPushPayload(params) {
  const { subscription, payload } = params;

  const p256dh = subscription.keys.p256dh;
  const authSecret = base64urlDecode(subscription.keys.auth);
  const subscriberPubJwk = p256dhToJwk(p256dh);
  const subscriberPubBytes = base64urlDecode(p256dh);

  // Generate ephemeral ECDH key pair
  const { publicKeyUncompressed: ephPub, privateKey: ephPrivKey } = await generateEcdhKeyPair();

  // Import subscriber's public key for ECDH
  const subscriberPubKey = await crypto.subtle.importKey(
    "jwk",
    subscriberPubJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberPubKey }, ephPrivKey, 256)
  );

  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prk = await hkdfExtract(authSecret, ecdhSecret);

  // key_info = "WebPush: info\0" || eph_pub || sub_pub
  const webPushInfo = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(webPushInfo.length + 65 + 65);
  keyInfo.set(webPushInfo, 0);
  keyInfo.set(ephPub, webPushInfo.length);
  keyInfo.set(subscriberPubBytes, webPushInfo.length + 65);

  // CEK = HKDF-Expand(PRK, key_info, 16)
  const cek = await hkdfExpand(prk, keyInfo, 16);
  // nonce = HKDF-Expand(PRK, key_info, 12)
  const nonce = await hkdfExpand(prk, keyInfo, 12);

  // Encrypt: AES-128-GCM(CEK, nonce, payload || 0x02)
  const plaintext = new TextEncoder().encode(payload);
  const paddedPlaintext = new Uint8Array(plaintext.length + 1);
  paddedPlaintext.set(plaintext, 0);
  paddedPlaintext[plaintext.length] = 0x02;

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, paddedPlaintext)
  );

  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65)
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
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