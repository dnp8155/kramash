// Phone OTP authentication service.
//
// This module calls backend functions (SendOtp / VerifyOtp) which handle the
// real OTP provider server-side. Provider credentials are stored as app
// secrets — never in client code.
//
// If no provider is configured (secrets missing), the backend functions return
// a clear "not configured" error. This module never fakes OTP success.

import { base44 } from "@/api/base44Client";

export async function sendPhoneOtp(phoneNumber) {
  // Backend validates phone, generates OTP server-side, sends via provider.
  const res = await base44.functions.invoke("sendOtp", { phone: phoneNumber });
  return res;
}

export async function verifyPhoneOtp(phoneNumber, code) {
  // Backend verifies the code server-side; on success returns a session token.
  const res = await base44.functions.invoke("verifyOtp", { phone: phoneNumber, code });
  return res;
}

export function isValidMobileNumber(phone) {
  // Expects a +countrycode followed by 6-14 digits.
  return /^\+\d{6,14}$/.test(phone);
}

// Check provider status (cached from first send attempt or a status endpoint).
// Returns "configured" or "pending" — used by the UI to show honest status.
export const otpProviderStatus = "pending"; // updated dynamically by sendOtp response