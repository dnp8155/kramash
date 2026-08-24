// Phone OTP authentication service — Firebase Phone Auth edition.
//
// Firebase handles OTP sending and verification client-side. After Firebase
// verifies the phone, the Firebase ID token is sent to the verifyFirebaseToken
// backend function, which verifies the token and looks up the Base44 user.
//
// If Firebase is not configured (placeholder values in firebaseConfig.js),
// the UI shows an honest "not configured" message.

import { base44 } from "@/api/base44Client";
import { isFirebaseReady, sendFirebaseOtp, verifyFirebaseOtp, resetRecaptcha } from "./firebaseAuth";
import { firebaseConfig } from "./firebaseConfig";

export const otpProviderStatus = isFirebaseReady() ? "configured" : "pending";

export function isPhoneAuthReady() {
  return isFirebaseReady();
}

let confirmationResult = null;

export async function sendPhoneOtp(phoneNumber, recaptchaContainerId = "firebase-recaptcha") {
  confirmationResult = await sendFirebaseOtp(phoneNumber, recaptchaContainerId);
  return { ok: true };
}

export async function verifyPhoneOtp(phoneNumber, code) {
  if (!confirmationResult) {
    throw new Error("OTP session expired. Please request a new code.");
  }
  const { token, phone, uid } = await verifyFirebaseOtp(confirmationResult, code);
  confirmationResult = null;

  // Send Firebase token to backend for verification and user lookup.
  const res = await base44.functions.invoke("verifyFirebaseToken", {
    token,
    phone,
    uid,
    apiKey: firebaseConfig.apiKey
  });
  return res;
}

export function isValidMobileNumber(phone) {
  return /^\+\d{6,14}$/.test(phone);
}

export { resetRecaptcha };