// WebAuthn browser API wrappers — converts between base64url strings and ArrayBuffers.

function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWebAuthnSupported() {
  return (
    typeof window !== "undefined" &&
    "credentials" in navigator &&
    "PublicKeyCredential" in window
  );
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    // ignore
  }
  return false;
}

export async function createCredential(publicKeyOptions) {
  const options = {
    ...publicKeyOptions,
    challenge: base64urlToUint8Array(publicKeyOptions.challenge),
    user: {
      ...publicKeyOptions.user,
      id: base64urlToUint8Array(publicKeyOptions.user.id),
    },
  };
  if (publicKeyOptions.excludeCredentials) {
    options.excludeCredentials = publicKeyOptions.excludeCredentials.map((c) => ({
      ...c,
      id: base64urlToUint8Array(c.id),
    }));
  }
  const credential = await navigator.credentials.create({ publicKey: options });
  let transports = [];
  try {
    transports = credential.response.getTransports ? credential.response.getTransports() : [];
  } catch {
    // ignore
  }
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      attestationObject: uint8ArrayToBase64url(new Uint8Array(credential.response.attestationObject)),
      clientDataJSON: uint8ArrayToBase64url(new Uint8Array(credential.response.clientDataJSON)),
      transports,
    },
  };
}

export async function getCredential(publicKeyOptions) {
  const options = {
    ...publicKeyOptions,
    challenge: base64urlToUint8Array(publicKeyOptions.challenge),
  };
  if (publicKeyOptions.allowCredentials) {
    options.allowCredentials = publicKeyOptions.allowCredentials.map((c) => ({
      ...c,
      id: base64urlToUint8Array(c.id),
    }));
  }
  const credential = await navigator.credentials.get({ publicKey: options });
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      authenticatorData: uint8ArrayToBase64url(new Uint8Array(credential.response.authenticatorData)),
      clientDataJSON: uint8ArrayToBase64url(new Uint8Array(credential.response.clientDataJSON)),
      signature: uint8ArrayToBase64url(new Uint8Array(credential.response.signature)),
    },
  };
}