import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";

function getSecret(name) {
  try {
    return secrets.get(name) || null;
  } catch {
    return null;
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const vapidPublicKey = getSecret("VAPID_PUBLIC_KEY");
    return Response.json({ vapidPublicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}