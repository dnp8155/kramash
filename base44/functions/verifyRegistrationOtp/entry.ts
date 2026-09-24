import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

const ANON_KEY = "sb_publishable_BKGx06R_bgjb7WT2f7K0OQ_5tPeO7CF";

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase().trim();
    const code = body?.code;
    const password = body?.password;

    if (!email || !code || !password) {
      return Response.json({ error: 'Email, code, and password are required' }, { status: 400 });
    }

    const supabaseUrl = secrets.get('SUPABASE_URL');
    const serviceRoleKey = secrets.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    const anonHeaders = {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    };

    // Sign in as the user to get access_token for reauthentication verify
    const signInResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({ email, password }),
    });
    const signInData = await signInResp.json();

    if (!signInResp.ok) {
      return Response.json({ error: signInData?.message || 'Failed to verify' }, { status: 400 });
    }

    const accessToken = signInData.access_token;

    // Verify the reauthentication OTP code
    const verifyResp = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        ...anonHeaders,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email,
        token: String(code),
        type: 'reauthentication',
      }),
    });
    const verifyData = await verifyResp.json();

    if (!verifyResp.ok) {
      const msg = verifyData?.message || verifyData?.msg || 'Invalid verification code';
      return Response.json({ error: msg }, { status: 400 });
    }

    // OTP verified — return the session so client can use it
    return Response.json({
      ok: true,
      email,
      access_token: signInData.access_token,
      refresh_token: signInData.refresh_token,
      expires_in: signInData.expires_in,
      user: signInData.user,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}