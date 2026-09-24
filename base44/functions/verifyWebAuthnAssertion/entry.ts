// verifyWebAuthnAssertion — Verify a WebAuthn assertion and return the authenticated user.
// Ported from supabase/functions/verifyWebAuthnAssertion — uses Supabase admin client + webauthn core.
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import {
  base64urlDecode, verifyChallengeToken, verifyAssertion,
  getOrigin, getRpId
} from "../../shared/webauthnCore.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { challenge_token, assertion_response } = body;
    if (!challenge_token || !assertion_response) {
      return Response.json({ error: "challenge_token and assertion_response required" }, { status: 400 });
    }

    const payload = await verifyChallengeToken(challenge_token);
    const userId = payload.userId;
    const expectedChallenge = payload.challenge;

    const { data: creds } = await supabaseAdmin
      .from("user_auth_credentials")
      .select("*")
      .eq("user_id", userId);
    if (!creds || creds.length === 0) return Response.json({ error: "No credentials found" }, { status: 404 });

    const credentialId = assertion_response.id;
    const cred = creds.find((c) => c.credential_id === credentialId);
    if (!cred) return Response.json({ error: "Credential not found" }, { status: 404 });

    let storedPublicKeyJwk;
    try { storedPublicKeyJwk = JSON.parse(cred.public_key); } catch { return Response.json({ error: "Invalid stored public key" }, { status: 500 }); }

    const authenticatorData = base64urlDecode(assertion_response.response.authenticatorData);
    const clientDataJSON = base64urlDecode(assertion_response.response.clientDataJSON);
    const signature = base64urlDecode(assertion_response.response.signature);

    const expectedOrigin = getOrigin(req);
    const expectedRpId = getRpId(req);

    const result = await verifyAssertion({
      authenticatorData, clientDataJSON, signature,
      storedPublicKeyJwk, expectedChallenge, expectedOrigin, expectedRpId,
      storedCounter: cred.counter || 0
    });

    await supabaseAdmin
      .from("user_auth_credentials")
      .update({ counter: result.newCounter })
      .eq("id", cred.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!profile) return Response.json({ error: "User profile not found" }, { status: 404 });

    return Response.json({
      ok: true,
      user: {
        id: profile.id, email: profile.email, full_name: profile.full_name,
        phone: profile.phone, role: profile.role
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}