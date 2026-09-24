import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { base64urlDecode, base64urlEncode, decodeCbor, parseAuthData, verifyChallengeToken, getOrigin, getRpId } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { credential, challengeToken, deviceLabel } = body;
    if (!credential || !challengeToken) return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });

    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;

    const attestationObject = base64urlDecode(credential.response.attestationObject);
    const clientDataJSON = base64urlDecode(credential.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

    if (clientData.type !== "webauthn.create") return Response.json({ error: "Invalid clientData type: " + clientData.type }, { status: 400 });
    const expectedOrigin = getOrigin(req);
    if (clientData.origin !== expectedOrigin) return Response.json({ error: "Origin mismatch" }, { status: 400 });
    if (clientData.challenge !== expectedChallenge) return Response.json({ error: "Challenge mismatch" }, { status: 400 });

    const { value: attObj } = decodeCbor(attestationObject, 0);
    const authData = attObj.authData;

    const expectedRpId = getRpId(req);
    const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId)));
    const authDataRpIdHash = authData.slice(0, 32);
    let rpIdMatch = true;
    for (let i = 0; i < 32; i++) { if (expectedRpIdHash[i] !== authDataRpIdHash[i]) { rpIdMatch = false; break; } }
    if (!rpIdMatch) return Response.json({ error: "RP ID hash mismatch" }, { status: 400 });

    const parsed = parseAuthData(authData);
    if (!parsed.credentialId || !parsed.credentialPublicKeyJwk) return Response.json({ error: "No attested credential data in authData" }, { status: 400 });

    const credentialIdB64 = base64urlEncode(parsed.credentialId);
    const publicKeyJwkStr = JSON.stringify(parsed.credentialPublicKeyJwk);

    const existing = await base44.asServiceRole.entities.UserAuthCredential.filter(
      { user_id: user.id, credential_id: credentialIdB64 }, "-created_date", 5
    );
    if (existing && existing.length > 0) return Response.json({ error: "Credential already registered" }, { status: 409 });

    const created = await base44.asServiceRole.entities.UserAuthCredential.create({
      user_id: user.id, credential_id: credentialIdB64, public_key: publicKeyJwkStr,
      counter: parsed.counter, device_label: deviceLabel || "Device",
      transports: credential.response.transports ? JSON.stringify(credential.response.transports) : ""
    });

    return Response.json({ verified: true, credentialId: credentialIdB64, credential: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}