// generateWebAuthnAssertionChallenge — Create challenge for passkey login.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { base64urlEncode, generateChallenge, createChallengeToken, getRpId } from "../_shared/webauthnCore.ts";
import { safeJson } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rpId = getRpId(req);
    if (!rpId) return Response.json({ error: "Could not determine RP ID from request" }, { status: 400 });

    const { data: credentials } = await supabaseAdmin.from("user_auth_credentials").select("*").eq("user_id", user.id);
    if (!credentials || credentials.length === 0) return Response.json({ error: "No registered credentials found" }, { status: 404 });

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);

    const allowCredentials = credentials.map((c) => {
      const entry: any = { type: "public-key", id: c.credential_id };
      if (c.transports) { entry.transports = safeJson(c.transports) || []; }
      return entry;
    });

    return Response.json({ challenge: base64urlEncode(challenge), challengeToken, rpId, allowCredentials, userVerification: "required", timeout: 60000 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});