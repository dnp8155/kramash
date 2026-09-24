import { withCors } from "../_shared/cors.ts";
// verifyWebAuthnAssertion — Verify passkey login assertion + update counter.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { base64urlDecode, verifyAssertion, verifyChallengeToken, getOrigin, getRpId } from "../_shared/webauthnCore.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { credential, challengeToken } = body;
    if (!credential || !challengeToken) return Response.json({ error: "credential and challengeToken are required" }, { status: 400 });

    const tokenPayload = await verifyChallengeToken(challengeToken);
    const expectedChallenge = tokenPayload.challenge;

    const { data: creds } = await supabaseAdmin.from("user_auth_credentials").select("*").eq("user_id", user.id).eq("credential_id", credential.id);
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

    await supabaseAdmin.from("user_auth_credentials").update({ counter: result.newCounter }).eq("id", storedCred.id);

    return Response.json({ verified: true });
  } catch (error) {
    return Response.json({ error: error.message, verified: false }, { status: 500 });
  }
}));