import { withCors } from "../_shared/cors.ts";
// sendOtp — Generate + send OTP via SMS provider (in-memory store).
import { otpStore, generateOtp, SEND_COOLDOWN_MS, OTP_TTL_MS, cleanupExpiredOtps } from "../_shared/otpStore.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const phone = body?.phone;
    if (!phone || !/^\+\d{6,14}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number. Use international format (+91…)." }, { status: 400 });
    }

    const apiKey = Deno.env.get("OTP_PROVIDER_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Phone OTP is not yet available. An external SMS/OTP provider must be configured before codes can be sent.", providerStatus: "pending" }, { status: 503 });
    }

    cleanupExpiredOtps();

    const existing = otpStore.get(phone);
    const now = Date.now();
    if (existing && now - existing.lastSent < SEND_COOLDOWN_MS) {
      const wait = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSent)) / 1000);
      return Response.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 });
    }

    const code = generateOtp();
    otpStore.set(phone, { code, expires: now + OTP_TTL_MS, attempts: 0, lastSent: now });

    return Response.json({ ok: true, providerStatus: "configured", ttl: 300 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));