import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { base64urlEncode, generateChallenge, createChallengeToken, getRpId } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rpId = getRpId(req);
    if (!rpId) return Response.json({ error: "Could not determine RP ID from request" }, { status: 400 });

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);

    const existingCreds = await base44.asServiceRole.entities.UserAuthCredential.filter(
      { user_id: user.id }, "-created_date", 100
    );
    const excludeCredentials = (existingCreds || []).map((c) => ({ type: "public-key", id: c.credential_id }));

    const userIdBytes = new TextEncoder().encode(user.id);

    return Response.json({
      challenge: base64urlEncode(challenge), challengeToken,
      rp: { name: "Kramasha", id: rpId },
      user: { id: base64urlEncode(userIdBytes), name: user.email || user.id, displayName: user.full_name || user.email || "User" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000, attestation: "none", excludeCredentials
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}