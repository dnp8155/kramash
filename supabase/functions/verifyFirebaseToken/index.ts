import { withCors } from "../_shared/cors.ts";
// verifyFirebaseToken — Verify Firebase ID token + look up user by phone.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { token, phone, uid } = body;
    if (!token || !phone) return Response.json({ error: "Missing Firebase token or phone." }, { status: 400 });

    const apiKey = Deno.env.get("FIREBASE_API_KEY");
    if (!apiKey) return Response.json({ error: "Firebase phone authentication is not configured." }, { status: 503 });

    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return Response.json({ error: "Invalid or expired Firebase token.", details: err?.error?.message }, { status: 401 });
    }

    const verifyData = await verifyRes.json();
    const fbUser = verifyData?.users?.[0];
    if (!fbUser || fbUser.phoneNumber !== phone) return Response.json({ error: "Phone number mismatch." }, { status: 401 });

    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    const matchedUser = (users || []).find((u) => u.phone === phone);

    if (!matchedUser) {
      return Response.json({ ok: true, needsRegistration: true, phone, firebaseUid: uid || fbUser.localId });
    }

    return Response.json({ ok: true, phone, user: { id: matchedUser.id, email: matchedUser.email, full_name: matchedUser.full_name }, authenticated: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));