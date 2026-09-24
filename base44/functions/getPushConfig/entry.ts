import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  return {
    status: 200,
    body: {
      vapid_public_key: vapidPublicKey,
      enabled: !!vapidPublicKey
    }
  };
}