import { withCors } from "../_shared/cors.ts";
// generateWebAuthnRegistrationChallenge — Create challenge for passkey registration.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { base64urlEncode, generateChallenge, createChallengeToken, getRpId } from "../_shared/webauthnCore.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rpId = getRpId(req);
    if (!rpId) return Response.json({ error: "Could not determine RP ID from request" }, { status: 400 });

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);

    const { data: existingCreds } = await supabaseAdmin.from("user_auth_credentials").select("credential_id").eq("user_id", user.id);
    const excludeCredentials = (existingCreds || []).map((c) => ({ type: "public-key", id: c.credential_id }));

    const userIdBytes = new TextEncoder().encode(user.id);

    return Response.json({
      challenge: base64urlEncode(challenge), challengeToken,
      rp: { name: "Kramasha", id: rpId },
      user: { id: base64urlEncode(userIdBytes), name: user.email || user.id, displayName: user.user_metadata?.full_name || user.email || "User" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000, attestation: "none", excludeCredentials
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));