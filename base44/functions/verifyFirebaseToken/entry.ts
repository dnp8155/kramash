// verifyFirebaseToken — Verify a Firebase ID token and return the matching user.
// Ported from supabase/functions/verifyFirebaseToken — uses Firebase Admin + Supabase admin client.
import { secrets } from 'base44:runtime';
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";

async function verifyFirebaseIdToken(idToken) {
  const apiKey = secrets.get("FIREBASE_API_KEY");
  if (!apiKey) throw new Error("FIREBASE_API_KEY not configured");
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firebase token verification failed: ${err}`);
  }
  const data = await res.json();
  if (!data.users || data.users.length === 0) throw new Error("No user found for Firebase token");
  return data.users[0];
}

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { id_token, phone } = body;
    if (!id_token) return Response.json({ error: "id_token required" }, { status: 400 });

    const fbUser = await verifyFirebaseIdToken(id_token);
    const phoneNumber = fbUser.phoneNumber || phone || "";

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("phone", phoneNumber)
      .limit(1);
    const profile = (profiles && profiles[0]) || null;

    if (!profile) return Response.json({ error: "User not found", phone: phoneNumber }, { status: 404 });

    return Response.json({
      user: {
        id: profile.id, email: profile.email, full_name: profile.full_name,
        phone: profile.phone, role: profile.role
      },
      firebase_user: { local_id: fbUser.localId, phone_number: phoneNumber }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}