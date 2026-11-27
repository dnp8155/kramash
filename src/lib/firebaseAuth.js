// Firebase Phone Auth helpers — wraps Firebase SDK for sending/verifying OTP.
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, firebaseNotConfigured } from "./firebaseConfig";

let recaptchaVerifier = null;

export function isFirebaseReady() {
  return !firebaseNotConfigured && auth !== null;
}

function getRecaptchaVerifier(containerId) {
  if (!auth) throw new Error("Firebase not initialized.");
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch {}
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {}
  });
  return recaptchaVerifier;
}

export async function sendFirebaseOtp(phone, containerId = "firebase-recaptcha") {
  if (!isFirebaseReady()) {
    throw new Error("Firebase is not configured. Add your Firebase project config in src/lib/firebaseConfig.js and enable Phone Authentication.");
  }
  const verifier = getRecaptchaVerifier(containerId);
  const result = await signInWithPhoneNumber(auth, phone, verifier);
  return result;
}

export async function verifyFirebaseOtp(confirmationResult, code) {
  const result = await confirmationResult.confirm(code);
  const user = result.user;
  const token = await user.getIdToken();
  return { token, phone: user.phoneNumber, uid: user.uid };
}

export function resetRecaptcha() {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch {}
    recaptchaVerifier = null;
  }
}