// generateWebAuthnAssertionChallenge — Generate an assertion challenge for passwordless login.
// Ported from supabase/functions/generateWebAuthnAssertionChallenge — uses Supabase admin client.
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import { generateChallenge, createChallengeToken, getRpId } from "../../shared/webauthnCore.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return Response.json({ error: "email required" }, { status: 400 });

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .limit(1);
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return Response.json({ error: "User not found" }, { status: 404 });

    const { data: creds } = await supabaseAdmin
      .from("user_auth_credentials")
      .select("*")
      .eq("user_id", profile.id);
    if (!creds || creds.length === 0) return Response.json({ error: "No WebAuthn credentials registered" }, { status: 404 });

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, profile.id);
    const rpId = getRpId(req);

    const allowCredentials = creds.map((c) => ({
      type: "public-key",
      id: c.credential_id,
      transports: (() => { try { return JSON.parse(c.transports || "[]"); } catch { return []; } })()
    }));

    return Response.json({
      challenge_token: challengeToken,
      challenge: [...challenge],
      rp_id: rpId,
      allow_credentials: allowCredentials,
      user_id: profile.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}