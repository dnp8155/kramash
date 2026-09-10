// VerifyFirebaseToken backend function.
// Verifies a Firebase ID token via Google Identity Toolkit REST API, then
// looks up the Base44 user by phone number.
//
// SECURITY:
// - Firebase ID token is verified server-side via Google's REST API.
// - The Firebase Web API key is public by Firebase design (included in client config).
// - User lookup uses the service role to search all User records by phone.
// - On success, returns user info or a needsRegistration flag.
//
// NOTE: Base44's auth SDK doesn't expose a phone-auth session creation API.
// The actual token issuance (logging the user in) is a pending platform
// integration point. This function verifies the phone and identifies the user.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { token, phone, uid, apiKey } = body;

    if (!token || !phone) {
      return Response.json({ error: "Missing Firebase token or phone." }, { status: 400 });
    }
    if (!apiKey) {
      return Response.json({ error: "Missing Firebase API key." }, { status: 400 });
    }

    // Verify the Firebase ID token via Google Identity Toolkit REST API.
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token })
      }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return Response.json(
        { error: "Invalid or expired Firebase token.", details: err?.error?.message },
        { status: 401 }
      );
    }

    const verifyData = await verifyRes.json();
    const fbUser = verifyData?.users?.[0];
    if (!fbUser || fbUser.phoneNumber !== phone) {
      return Response.json({ error: "Phone number mismatch." }, { status: 401 });
    }

    // Look up Base44 user by phone number using service role.
    const users = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const matchedUser = users.find((u) => u.phone === phone);

    if (!matchedUser) {
      return Response.json({
        ok: true,
        needsRegistration: true,
        phone,
        firebaseUid: uid || fbUser.localId
      });
    }

    // User found — return user info.
    // Session token issuance is pending Base44 platform support for phone auth.
    return Response.json({
      ok: true,
      phone,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        full_name: matchedUser.full_name
      },
      authenticated: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}