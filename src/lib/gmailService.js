// Gmail connection + sending, through the gmailAccount / sendClientEmail Edge Functions.
// The saved Gmail token stays on the server; the app only ever learns the connected address.
import { base44 } from "@/api/base44Client";
import { leaveForOAuth } from "@/lib/oauthReturn";

export const gmailStatus = (workspaceId) =>
  base44.functions.invoke("gmailAccount", { action: "status", workspace_id: workspaceId });

// Sends the person to Google to allow "send email"; Google returns them to Preferences.
// A first call can fail while the server wakes up (no HTTP status), so that one case is retried once, quietly.
export async function startGmailConnect(workspaceId) {
  const start = () => base44.functions.invoke("gmailAccount", { action: "start", workspace_id: workspaceId });
  let res;
  try { res = await start(); } catch (e) {
    if (e?.status) throw e;
    res = await start();
  }
  leaveForOAuth(res.url);
}

export const disconnectGmail = (workspaceId) =>
  base44.functions.invoke("gmailAccount", { action: "disconnect", workspace_id: workspaceId });

export const sendClientEmail = (payload) => base44.functions.invoke("sendClientEmail", payload);
