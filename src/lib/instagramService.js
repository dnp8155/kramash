// Instagram connection through the instagramAccount Edge Function (official Instagram API).
// The saved Instagram token stays on the server; the app only ever learns the connected @username.
import { base44 } from "@/api/base44Client";
import { leaveForOAuth } from "@/lib/oauthReturn";

export const instagramStatus = (workspaceId) =>
  base44.functions.invoke("instagramAccount", { action: "status", workspace_id: workspaceId });

// Sends the person to Instagram to allow reading their photos; Instagram returns them to My Profile.
// A first call can fail while the server wakes up (no HTTP status), so that one case is retried once, quietly.
export async function startInstagramConnect(workspaceId) {
  const start = () => base44.functions.invoke("instagramAccount", { action: "start", workspace_id: workspaceId });
  let res;
  try { res = await start(); } catch (e) {
    if (e?.status) throw e;
    res = await start();
  }
  leaveForOAuth(res.url);
}

export const disconnectInstagram = (workspaceId) =>
  base44.functions.invoke("instagramAccount", { action: "disconnect", workspace_id: workspaceId });
