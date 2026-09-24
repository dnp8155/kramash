import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabaseUrl = secrets.get('SUPABASE_URL');
    const serviceRoleKey = secrets.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete old OTPs for this email
    await fetch(`${supabaseUrl}/rest/v1/email_otps?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    // Insert new OTP
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/email_otps`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, expires_at: expiresAt }),
    });
    if (!insertResp.ok) {
      return Response.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // Send OTP email via SendEmail integration
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Your Kramasha verification code',
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px 0;">Verify your email</h2>
        <p style="color: #4a4a4a; margin: 0 0 24px 0;">Use the 6-digit code below to verify your email and finish creating your Kramasha account.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; color: #1a1d21;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">This code expires in 5 minutes. If you didn't create an account, you can safely ignore this email.</p>
      </div>`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}