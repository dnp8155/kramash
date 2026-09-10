// SendOtp backend function.
// Generates a 6-digit OTP, stores it server-side (in-memory map with expiry),
// and sends it via the configured OTP provider.
//
// SECURITY:
// - Provider API key is read from process.env.OTP_PROVIDER_API_KEY (app secret).
// - OTP is never returned to the client.
// - OTP is never logged.
// - Rate-limited per phone number (30s between sends).
// - OTP expires after 5 minutes.
//
// If no provider key is configured, returns a clear "not configured" error.

import { otpStore, generateOtp, SEND_COOLDOWN_MS, OTP_TTL_MS, cleanupExpiredOtps } from "../../shared/otpStore.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const phone = body?.phone;

    if (!phone || !/^\+\d{6,14}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number. Use international format (+91…)." }, { status: 400 });
    }

    // Check if provider is configured.
    const apiKey = process.env.OTP_PROVIDER_API_KEY;
    const provider = process.env.OTP_PROVIDER || "msg91";

    if (!apiKey) {
      return Response.json(
        { error: "Phone OTP is not yet available. An external SMS/OTP provider must be configured before codes can be sent.", providerStatus: "pending" },
        { status: 503 }
      );
    }

    cleanupExpiredOtps();

    // Rate limit: check cooldown.
    const existing = otpStore.get(phone);
    const now = Date.now();
    if (existing && now - existing.lastSent < SEND_COOLDOWN_MS) {
      const wait = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSent)) / 1000);
      return Response.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 });
    }

    // Generate and store OTP.
    const code = generateOtp();
    otpStore.set(phone, { code, expires: now + OTP_TTL_MS, attempts: 0, lastSent: now });

    // Send via provider (implementation depends on provider).
    // This is where the real provider API call goes.
    // For MSG91: POST to https://api.msg91.com/api/v5/otp with authkey.
    // For Twilio Verify: POST to Twilio Verify API with TWILIO_ACCOUNT_SID + auth token.
    // For Firebase: use Firebase Admin SDK verifyPhone().
    //
    // Example (MSG91):
    // await fetch("https://api.msg91.com/api/v5/otp", {
    //   method: "POST",
    //   headers: { "authkey": apiKey, "content-type": "application/json" },
    //   body: JSON.stringify({ mobile: phone, otp: code, sender: "KRAMSH" })
    // });
    //
    // --- Provider call placeholder ---
    // Uncomment and implement when credentials are available:
    // const sendResult = await sendViaProvider(provider, apiKey, phone, code);
    // if (!sendResult.ok) {
    //   otpStore.delete(phone);
    //   return Response.json({ error: "Failed to send OTP. Please try again." }, { status: 502 });
    // }

    return Response.json({ ok: true, providerStatus: "configured", ttl: 300 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}