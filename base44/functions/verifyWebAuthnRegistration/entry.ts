import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  base64urlDecode,
  base64urlEncode,
  decodeCbor,
  parseAuthData,
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
    const { credential, challengeToken, deviceLabel } = body;

    if (!credential || !challengeToken) {
      return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });
    }

    // Verify challenge token
    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;

    // Decode credential response
    const attestationObject = base64urlDecode(credential.response.attestationObject);
    const clientDataJSON = base64urlDecode(credential.response.clientDataJSON);

    // Parse clientDataJSON
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

    // Verify type
    if (clientData.type !== "webauthn.create") {
      return Response.json({ error: "Invalid clientData type: " + clientData.type }, { status: 400 });
    }

    // Verify origin
    const expectedOrigin = getOrigin(req);
    if (clientData.origin !== expectedOrigin) {
      return Response.json({ error: "Origin mismatch: " + clientData.origin + " vs " + expectedOrigin }, { status: 400 });
    }

    // Verify challenge
    if (clientData.challenge !== expectedChallenge) {
      return Response.json({ error: "Challenge mismatch" }, { status: 400 });
    }

    // Parse attestationObject (CBOR map: { fmt, authData, attStmt })
    const { value: attObj } = decodeCbor(attestationObject, 0);
    const authData = attObj.authData;

    // Verify RP ID hash
    const expectedRpId = getRpId(req);
    const expectedRpIdHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId))
    );
    const authDataRpIdHash = authData.slice(0, 32);
    let rpIdMatch = true;
    for (let i = 0; i < 32; i++) {
      if (expectedRpIdHash[i] !== authDataRpIdHash[i]) {
        rpIdMatch = false;
        break;
      }
    }
    if (!rpIdMatch) {
      return Response.json({ error: "RP ID hash mismatch" }, { status: 400 });
    }

    // Parse authData to extract credential ID and public key
    const parsed = parseAuthData(authData);
    if (!parsed.credentialId || !parsed.credentialPublicKeyJwk) {
      return Response.json({ error: "No attested credential data in authData" }, { status: 400 });
    }

    const credentialIdB64 = base64urlEncode(parsed.credentialId);
    const publicKeyJwkStr = JSON.stringify(parsed.credentialPublicKeyJwk);

    // Check for duplicate credential
    const existing = await base44.entities.UserAuthCredential.filter({
      user_id: user.id,
      credential_id: credentialIdB64,
    });
    if (existing && existing.length > 0) {
      return Response.json({ error: "Credential already registered" }, { status: 409 });
    }

    // Store credential
    const created = await base44.entities.UserAuthCredential.create({
      user_id: user.id,
      credential_id: credentialIdB64,
      public_key: publicKeyJwkStr,
      counter: parsed.counter,
      device_label: deviceLabel || "Device",
      transports: credential.response.transports ? JSON.stringify(credential.response.transports) : "",
    });

    // Enable app lock on the user
    await base44.auth.updateMe({ app_lock_enabled: true });

    return Response.json({
      verified: true,
      credentialId: credentialIdB64,
      credential: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}