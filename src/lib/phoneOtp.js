// Phone OTP authentication service abstraction.
//
// Kramashah Beta scope includes Phone OTP login. Real OTP delivery requires an
// external SMS/OTP provider (e.g. Twilio, MSG91, Firebase Auth, or a Base44
// phone-auth integration) which is NOT yet configured in this environment.
//
// This module exposes a clean service interface so a provider can be wired in
// later without changing the UI. Until a provider is configured, the functions
// below reject with a clear "pending external provider" message — they never
// simulate or fake a production OTP login.
//
// To enable real OTP:
//   1. Provision an SMS/OTP provider and obtain credentials.
//   2. Create a backend function (base44/functions/SendOtp/entry.ts) that
//      stores the OTP server-side and sends it via the provider. Never put
//      provider API keys in client code.
//   3. Create a VerifyOtp backend function that validates the code server-side.
//   4. Replace the stub implementations below to call those backend functions.
//
// Required external configuration:
//   - OTP_PROVIDER_API_KEY / OTP_PROVIDER_SECRET (stored via app secrets)
//   - Sender ID / template approved by the provider

const OTP_PROVIDER_CONFIGURED = false; // flip to true once a provider is wired in

export async function sendPhoneOtp(phoneNumber) {
  if (!OTP_PROVIDER_CONFIGURED) {
    throw new Error(
      "Phone OTP is not yet available. An external SMS/OTP provider must be configured before login codes can be sent."
    );
  }
  // When configured, call the SendOtp backend function here.
  // return invokeFunction("SendOtp", { phone: phoneNumber });
}

export async function verifyPhoneOtp(phoneNumber, code) {
  if (!OTP_PROVIDER_CONFIGURED) {
    throw new Error(
      "Phone OTP verification is pending external provider configuration."
    );
  }
  // When configured, call the VerifyOtp backend function here.
  // return invokeFunction("VerifyOtp", { phone: phoneNumber, code });
}

export function isValidMobileNumber(phone) {
  // Expects a +countrycode followed by 6-14 digits.
  return /^\+\d{6,14}$/.test(phone);
}

export const otpProviderStatus = OTP_PROVIDER_CONFIGURED ? "configured" : "pending";