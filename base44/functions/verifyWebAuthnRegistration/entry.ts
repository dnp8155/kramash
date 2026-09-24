// verifyWebAuthnRegistration — Verify a WebAuthn registration response and store the credential.
// Ported from supabase/functions/verifyWebAuthnRegistration — uses Supabase admin client + webauthn core.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import {
  base64urlDecode, base64urlEncode, verifyChallengeToken,
  parseAuthData, getOrigin, getRpId
} from "../../shared/webauthnCore.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { challenge_token, credential_response, device_label } = body;
    if (!challenge_token || !credential_response) {
      return Response.json({ error: "challenge_token and credential_response required" }, { status: 400 });
    }

    const payload = await verifyChallengeToken(challenge_token);
    if (payload.userId !== user.id) return Response.json({ error: "Challenge user mismatch" }, { status: 403 });

    const clientDataJSON = base64urlDecode(credential_response.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
    if (clientData.type !== "webauthn.create") return Response.json({ error: "Invalid clientData type" }, { status: 400 });

    const expectedOrigin = getOrigin(req);
    if (clientData.origin !== expectedOrigin) return Response.json({ error: "Origin mismatch" }, { status: 400 });

    const expectedChallenge = payload.challenge;
    if (clientData.challenge !== expectedChallenge) return Response.json({ error: "Challenge mismatch" }, { status: 400 });

    const authData = base64urlDecode(credential_response.response.attestationObject);
    const parsed = parseAuthData(authData);
    if (!parsed.credentialId || !parsed.credentialPublicKeyJwk) {
      return Response.json({ error: "Missing credential data in authData" }, { status: 400 });
    }

    const expectedRpId = getRpId(req);
    const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId)));
    let rpIdMatch = true;
    for (let i = 0; i < 32; i++) {
      if (expectedRpIdHash[i] !== parsed.rpIdHash[i]) { rpIdMatch = false; break; }
    }
    if (!rpIdMatch) return Response.json({ error: "RP ID hash mismatch" }, { status: 400 });

    const credentialId = base64urlEncode(parsed.credentialId);
    const publicKeyJwkStr = JSON.stringify(parsed.credentialPublicKeyJwk);
    const transports = credential_response.response?.transports || [];

    const { data: existing } = await supabaseAdmin
      .from("user_auth_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("credential_id", credentialId)
      .limit(1);
    if (existing && existing.length > 0) return Response.json({ error: "Credential already registered" }, { status: 409 });

    const { data: cred } = await supabaseAdmin
      .from("user_auth_credentials")
      .insert({
        user_id: user.id, credential_id: credentialId,
        public_key: publicKeyJwkStr, counter: parsed.counter,
        device_label: device_label || "WebAuthn Device",
        transports: JSON.stringify(transports)
      })
      .select("*")
      .single();

    return Response.json({
      ok: true,
      credential: { id: cred?.id, credential_id: credentialId, device_label: cred?.device_label }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}