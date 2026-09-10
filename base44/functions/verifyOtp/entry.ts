// VerifyOtp backend function.
// Validates the OTP code server-side. On success, returns authentication
// confirmation for the phone number.
//
// SECURITY:
// - OTP is verified from the server-side store — never from client state.
// - Max 5 attempts per OTP; expired OTPs are rejected.
// - On success, the OTP is consumed (deleted from store).
// - OTP values are never logged.

import { otpStore, MAX_ATTEMPTS, cleanupExpiredOtps } from "../../shared/otpStore.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const phone = body?.phone;
    const code = body?.code;

    if (!phone || !/^\+\d{6,14}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number." }, { status: 400 });
    }
    if (!code || !/^\d{4,6}$/.test(String(code))) {
      return Response.json({ error: "Invalid code format." }, { status: 400 });
    }

    cleanupExpiredOtps();

    const entry = otpStore.get(phone);
    if (!entry) {
      return Response.json({ error: "No code was sent to this number. Please request a new one." }, { status: 400 });
    }

    const now = Date.now();
    if (now > entry.expires) {
      otpStore.delete(phone);
      return Response.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(phone);
      return Response.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
    }

    if (entry.code !== String(code)) {
      entry.attempts++;
      otpStore.set(phone, entry);
      const remaining = MAX_ATTEMPTS - entry.attempts;
      return Response.json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` }, { status: 400 });
    }

    // Success — consume the OTP.
    otpStore.delete(phone);

    // Check if provider is configured (redundant safety check).
    const apiKey = process.env.OTP_PROVIDER_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Phone OTP provider is not configured." },
        { status: 503 }
      );
    }

    // Look up user by phone number. The User entity may have a phone field
    // if set during profile setup. If no user found, the client should
    // redirect to registration.
    //
    // In a full implementation, this would:
    // 1. Find the User record with this phone number.
    // 2. If found, issue a session token via the Base44 auth system.
    // 3. If not found, return { needsRegistration: true, phone }.
    //
    // Base44's auth SDK doesn't expose a phone-auth login API directly,
    // so the actual token issuance depends on platform capabilities.
    // This is a known integration point — documented as pending.

    return Response.json({
      ok: true,
      phone,
      authenticated: true,
      // In production: return a session token here.
      // token: await issueSessionToken(phone)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}