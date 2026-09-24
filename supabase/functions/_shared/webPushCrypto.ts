// Web Push encryption (RFC 8291 / aes128gcm) + VAPID JWT.
// Pure crypto — copied from base44/shared/webPushCrypto.ts with Deno-compatible imports.

import { base64urlEncode, base64urlDecode, derToRaw } from "./webauthnCore.ts";

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
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

function p256dhToJwk(p256dhBase64url: string): any {
  const pubKeyBytes = base64urlDecode(p256dhBase64url);
  const x = base64urlEncode(pubKeyBytes.slice(1, 33));
  const y = base64urlEncode(pubKeyBytes.slice(33, 65));
  return { kty: "EC", crv: "P-256", x, y };
}

function vapidKeysToJwk(privateKeyBase64url: string, publicKeyBase64url: string): any {
  const pubKeyBytes = base64urlDecode(publicKeyBase64url);
  const x = base64urlEncode(pubKeyBytes.slice(1, 33));
  const y = base64urlEncode(pubKeyBytes.slice(33, 65));
  return { kty: "EC", crv: "P-256", d: privateKeyBase64url, x, y };
}

export async function createVapidJwt(params: { endpoint: string; vapidPrivateKey: string; vapidPublicKey: string; subject: string }): Promise<string> {
  const { endpoint, vapidPrivateKey, vapidPublicKey, subject } = params;
  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;

  const jwk = vapidKeysToJwk(vapidPrivateKey, vapidPublicKey);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject };

  const encHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const derSignature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  const rawSignature = derToRaw(new Uint8Array(derSignature));
  const encSignature = base64urlEncode(rawSignature);

  return `${encHeader}.${encPayload}.${encSignature}`;
}

export async function encryptPushPayload(params: { subscription: any; payload: string }): Promise<Uint8Array> {
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
  paddedPlaintext[plaintext.length] = 0x02;

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, paddedPlaintext));

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
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