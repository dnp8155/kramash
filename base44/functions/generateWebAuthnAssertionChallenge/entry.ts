import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { base64urlEncode, generateChallenge, createChallengeToken, getRpId, safeJson } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rpId = getRpId(req);
    if (!rpId) return Response.json({ error: "Could not determine RP ID from request" }, { status: 400 });

    const credentials = await base44.asServiceRole.entities.UserAuthCredential.filter(
      { user_id: user.id }, "-created_date", 100
    );
    if (!credentials || credentials.length === 0) return Response.json({ error: "No registered credentials found" }, { status: 404 });

    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);

    const allowCredentials = credentials.map((c) => {
      const entry = { type: "public-key", id: c.credential_id };
      if (c.transports) { entry.transports = safeJson(c.transports) || []; }
      return entry;
    });

    return Response.json({ challenge: base64urlEncode(challenge), challengeToken, rpId, allowCredentials, userVerification: "required", timeout: 60000 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}