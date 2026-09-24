// generateWebAuthnRegistrationChallenge — Generate a registration challenge for a logged-in user.
// Ported from supabase/functions/generateWebAuthnRegistrationChallenge — uses Supabase admin client.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { generateChallenge, createChallengeToken, getRpId } from "../../shared/webauthnCore.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const deviceLabel = body.device_label || "WebAuthn Device";

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);

    const rpId = getRpId(req);
    const publicKey = {
      challenge: [...challenge],
      rp: { name: "Kramashah", id: rpId },
      user: {
        id: [...new TextEncoder().encode(user.id)],
        name: user.email || `user-${user.id}`,
        displayName: user.full_name || user.email || "User"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: "none"
    };

    return Response.json({
      challenge_token: challengeToken,
      public_key: publicKey,
      device_label: deviceLabel,
      rp_id: rpId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}