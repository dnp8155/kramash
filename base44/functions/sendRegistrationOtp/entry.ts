import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

const ANON_KEY = "sb_publishable_BKGx06R_bgjb7WT2f7K0OQ_5tPeO7CF";

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase().trim();
    const password = body?.password;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseUrl = secrets.get('SUPABASE_URL');
    const serviceRoleKey = secrets.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    const adminHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
    const anonHeaders = {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    };

    // Step 1: Create user via admin API (email_confirm: true since autoconfirm is on)
    const createResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'user' },
      }),
    });

    let userExists = false;
    if (!createResp.ok) {
      const errData = await createResp.json().catch(() => ({}));
      // If user already exists, we can still send OTP (resend flow)
      if (errData?.code === 'user_already_exists' || errData?.msg?.includes('already') || createResp.status === 400) {
        userExists = true;
      } else {
        return Response.json({ error: errData?.message || errData?.msg || 'Failed to create account' }, { status: 400 });
      }
    }

    // Step 2: Sign in as the user to get an access_token
    const signInResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({ email, password }),
    });
    const signInData = await signInResp.json();

    if (!signInResp.ok) {
      // If user exists but password doesn't match, they need to log in instead
      if (userExists) {
        return Response.json({ error: 'An account with this email already exists. Try logging in instead.' }, { status: 400 });
      }
      return Response.json({ error: signInData?.message || 'Failed to sign in' }, { status: 400 });
    }

    const accessToken = signInData.access_token;

    // Step 3: Trigger reauthenticate — sends OTP email with {{ .Token }}
    const reauthResp = await fetch(`${supabaseUrl}/auth/v1/reauthenticate`, {
      method: 'GET',
      headers: {
        ...anonHeaders,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const reauthText = await reauthResp.text().catch(() => '');
    if (!reauthResp.ok) {
      let reauthData;
      try { reauthData = JSON.parse(reauthText); } catch { reauthData = { raw: reauthText }; }
      return Response.json({ error: reauthData?.message || reauthData?.msg || reauthData?.raw || 'Failed to send verification code', reauthStatus: reauthResp.status, reauthData }, { status: 500 });
    }

    return Response.json({ ok: true, userExists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}