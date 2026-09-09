import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Phone OTP service abstraction.
//
// Delivery uses Twilio Verify when the following secrets are configured in
// dashboard settings -> environment variables:
//   - TWILIO_ACCOUNT_SID
//   - TWILIO_AUTH_TOKEN
//   - TWILIO_VERIFY_SERVICE_SID
//
// When the secrets are absent the function returns 503 so the UI can surface a
// clear "not configured yet" state instead of faking a verification.
//
// NOTE ON SESSION LOGIN: Base44's built-in auth resolves sessions by email /
// OAuth — there is no SDK method to log a user in purely from a verified phone
// number. Phone OTP verification therefore proves the number, but mapping it
// to an existing account and establishing a session requires platform
// phone-auth support (pending). This function performs real OTP send/verify
// only and documents that limitation in its response.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    const sid = secrets.get('TWILIO_ACCOUNT_SID');
    const token = secrets.get('TWILIO_AUTH_TOKEN');
    const verifySid = secrets.get('TWILIO_VERIFY_SERVICE_SID');

    if (!sid || !token || !verifySid) {
      return Response.json(
        {
          error: 'Phone OTP is not configured yet. An SMS provider (Twilio) is required.',
          configured: false,
        },
        { status: 503 }
      );
    }

    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return Response.json({ error: 'Enter a valid mobile number with country code (e.g. +91XXXXXXXXXX).' }, { status: 400 });
    }

    const authHeader = 'Basic ' + btoa(`${sid}:${token}`);

    if (action === 'send') {
      const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/Verifications`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      });
      if (!res.ok) {
        let msg = 'Failed to send OTP.';
        try { const e = await res.json(); msg = e.message || msg; } catch {}
        return Response.json({ error: msg }, { status: 502 });
      }
      return Response.json({ status: 'sent' });
    }

    if (action === 'verify') {
      if (!code) return Response.json({ error: 'OTP code is required.' }, { status: 400 });
      const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Code: code }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'approved') {
        return Response.json({ error: data.message || 'Invalid or expired OTP.' }, { status: 400 });
      }
      return Response.json({
        status: 'approved',
        note: 'Phone OTP verified. Phone-based session login requires platform phone-auth support (pending).',
      });
    }

    return Response.json({ error: 'Invalid action. Use "send" or "verify".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}