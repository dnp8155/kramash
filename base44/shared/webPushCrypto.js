// Web push crypto helpers — VAPID JWT and payload encryption (aes128gcm).
import crypto from "crypto";

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function b64urlToBuf(str) {
  return Buffer.from(str, "base64url");
}

export function createVapidJwt(vapidKeys, audience, subscriber) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subscriber
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: base64url(vapidKeys.publicKey).replace(/=/g, ""),
      y: "", // placeholder — real VAPID keys carry x/y; simplified for shared module
      d: base64url(vapidKeys.privateKey).replace(/=/g, "")
    },
    format: "jwk"
  }).export({ format: "der", type: "sec1" });

  // Simplified: in production, use a proper ECDSA P-256 signing flow.
  const signature = crypto.sign(null, Buffer.from(signingInput), key);
  return `${signingInput}.${base64url(signature)}`;
}

export function encryptPayload(payload, keys) {
  // Simplified placeholder — real aes128gcm requires ECDH key agreement with the
  // subscription's p256dh key + auth secret. For Base44 shared module, we return
  // the raw payload so the platform's SendPushNotification handles delivery.
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}