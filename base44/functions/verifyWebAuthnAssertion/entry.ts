import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { base64urlDecode, verifyAssertion, verifyChallengeToken, getOrigin, getRpId } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { credential, challengeToken } = body;
    if (!credential || !challengeToken) return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });

    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;

    const creds = await base44.asServiceRole.entities.UserAuthCredential.filter(
      { user_id: user.id, credential_id: credential.id }, "-created_date", 5
    );
    if (!creds || creds.length === 0) return Response.json({ error: "Credential not found" }, { status: 404 });
    const storedCred = creds[0];

    let storedPublicKeyJwk;
    try { storedPublicKeyJwk = JSON.parse(storedCred.public_key); } catch { return Response.json({ error: "Stored public key is invalid" }, { status: 500 }); }

    const authenticatorData = base64urlDecode(credential.response.authenticatorData);
    const clientDataJSON = base64urlDecode(credential.response.clientDataJSON);
    const signature = base64urlDecode(credential.response.signature);

    const result = await verifyAssertion({
      authenticatorData, clientDataJSON, signature, storedPublicKeyJwk,
      expectedChallenge, expectedOrigin: getOrigin(req), expectedRpId: getRpId(req),
      storedCounter: storedCred.counter || 0
    });

    await base44.asServiceRole.entities.UserAuthCredential.update(storedCred.id, { counter: result.newCounter });

    return Response.json({ verified: true });
  } catch (error) {
    return Response.json({ error: error.message, verified: false }, { status: 500 });
  }
}