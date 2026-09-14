import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  base64urlDecode,
  verifyAssertion,
  verifyChallengeToken,
  getOrigin,
  getRpId,
} from "../../shared/webauthnCore.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { credential, challengeToken } = body;

    if (!credential || !challengeToken) {
      return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });
    }

    // Verify challenge token
    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;

    // Look up the credential
    const creds = await base44.entities.UserAuthCredential.filter({
      user_id: user.id,
      credential_id: credential.id,
    });
    if (!creds || creds.length === 0) {
      return Response.json({ error: "Credential not found" }, { status: 404 });
    }
    const storedCred = creds[0];

    // Parse stored public key
    let storedPublicKeyJwk;
    try {
      storedPublicKeyJwk = JSON.parse(storedCred.public_key);
    } catch {
      return Response.json({ error: "Stored public key is invalid" }, { status: 500 });
    }

    // Decode assertion response
    const authenticatorData = base64urlDecode(credential.response.authenticatorData);
    const clientDataJSON = base64urlDecode(credential.response.clientDataJSON);
    const signature = base64urlDecode(credential.response.signature);

    // Verify assertion
    const result = await verifyAssertion({
      authenticatorData,
      clientDataJSON,
      signature,
      storedPublicKeyJwk,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRpId: getRpId(req),
      storedCounter: storedCred.counter || 0,
    });

    // Update counter
    await base44.entities.UserAuthCredential.update(storedCred.id, {
      counter: result.newCounter,
    });

    return Response.json({ verified: true });
  } catch (error) {
    return Response.json({ error: error.message, verified: false }, { status: 500 });
  }
}