// Sending an email to a client from the workspace's connected Gmail, and writing it to message_log.
// Used by sendClientEmail (a person pressed Send) and runMessageAutomation (a rule or a scheduled message).
import { supabaseAdmin } from "./supabaseClient.ts";
import { resolvePlanContext } from "./planEngine.ts";
import { buildHtml, sendViaGmail, GmailAuthError } from "./gmail.ts";

// Same people the app treats as Pro without a subscription (see EXEMPT_ADMIN_EMAILS in src/lib/planService.js).
const EXEMPT = new Set(
  (Deno.env.get("PRO_EXEMPT_EMAILS") || "ns51@dipakpatel.site,krishnashahphotography@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
);

// Emailing clients is a Pro feature. Checked here too, so calling the function directly cannot skip the lock.
export async function isProWorkspace(workspaceId: string, ownerUserId?: string | null): Promise<boolean> {
  const ctx = await resolvePlanContext(workspaceId);
  if (ctx.planCode === "PRO") return true;
  if (!ownerUserId) return false;
  const { data: owner } = await supabaseAdmin.from("profiles").select("email").eq("id", ownerUserId).single();
  return !!owner?.email && EXEMPT.has(String(owner.email).toLowerCase());
}

export async function getGmailAccount(workspaceId: string) {
  const { data } = await supabaseAdmin.from("messaging_accounts").select("*").eq("workspace_id", workspaceId).eq("provider", "gmail").maybeSingle();
  return data || null;
}

export interface ClientEmailInput {
  workspace: any;
  account: any;
  client: any;
  eventId?: string | null;
  subject: string;
  body: string;
  templateId?: string | null;
  templateName?: string | null;
  createdBy: string;            // the person whose log this appears in
  automated?: boolean;
  ruleKey?: string | null;
  dedupeKey?: string | null;    // same key = never sent twice
}

export async function sendClientEmailNow(i: ClientEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string; id?: string }> {
  const to = String(i.client?.email || "").trim();
  if (!to) return { ok: false, error: "This client has no email address" };

  // The log row is written first. For automatic sends its unique dedupe_key is what stops two runs from both sending.
  const { data: row, error: insErr } = await supabaseAdmin.from("message_log").insert({
    workspace_id: i.workspace.id, event_id: i.eventId || null, client_id: i.client.id, channel: "email",
    template_id: i.templateId || null, template_name: i.templateName || null, recipient: to,
    subject: i.subject, body: i.body, status: "sending", automated: !!i.automated, rule_key: i.ruleKey || null,
    dedupe_key: i.dedupeKey || null, created_by_id: i.createdBy,
  }).select("id, tracking_token").single();
  if (insErr || !row) {
    if (insErr?.code === "23505") return { ok: true, skipped: true };
    return { ok: false, error: insErr?.message || "Could not record the message" };
  }

  try {
    const html = await buildHtml(i.body, row.tracking_token);
    const providerId = await sendViaGmail(i.account, { to, subject: i.subject, text: i.body, html, fromName: i.workspace?.name });
    await supabaseAdmin.from("message_log").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId }).eq("id", row.id);
    return { ok: true, id: row.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Could not send";
    await supabaseAdmin.from("message_log").update({ status: "failed", error }).eq("id", row.id);
    return { ok: false, error: e instanceof GmailAuthError ? error : error };
  }
}
