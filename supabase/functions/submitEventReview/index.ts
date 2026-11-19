import { withCors } from "../_shared/cors.ts";
// submitEventReview — A client writes or edits their review of the business (1–5 stars + optional text).
// One review per client, like a Google review: it can be edited any time once any of their events is over.
// Three ways in, each checked like the page the client is on:
//   * mode "track":  the Track page token (events.public_token), with Track sharing on (Pro), like getPublicEventData.
//   * mode "portal": the project portal token (quotations.public_token) + its password, like getPortalData.
//   * mode "client": the Client Portal session (clients.portal_access_token + client id), like get_client_portal_data.
//   * mode "link":   the client's own review link (clients.review_token), sent by the owner; open any time.
// With action "get" it only returns the review state (the pages load it this way); the link page also gets the
// business name / logo and the client's name.
// The owner gets a bell entry (and a push on Pro) that opens the client's page, where the review is kept.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { evaluateLinkAccess } from "../_shared/linkAccess.ts";
import { resolvePlanContext } from "../_shared/planEngine.ts";
import { trackSettings } from "../_shared/trackSettings.ts";
import { sendPushToUser } from "../_shared/sendPush.ts";
import { clientReviewState, REVIEW_MAX_LENGTH, reviewNotifyChannels } from "../_shared/clientReview.ts";

const UNAVAILABLE = "This page is not available.";
const UUID = /^[0-9a-f-]{36}$/i;

// Each resolver returns { clientId, workspaceId } for a valid link / session, or null.
async function fromTrack(token: string) {
  const { data: rows } = await supabaseAdmin.from("events").select("id, client_id, workspace_id, public_tracking_enabled, status")
    .eq("public_token", token).order("created_at", { ascending: false }).limit(1);
  const event = rows?.[0];
  if (!event || !event.public_tracking_enabled || event.status === "cancelled" || !event.client_id) return null;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("display_preferences").eq("id", event.workspace_id).single();
  if (!trackSettings(ws).enabled) return null;
  if ((await resolvePlanContext(event.workspace_id)).planCode !== "PRO") return null;
  return { clientId: event.client_id, workspaceId: event.workspace_id };
}

async function fromPortal(token: string, body: any) {
  const { data: rows } = await supabaseAdmin.from("quotations").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(1);
  const q = rows?.[0];
  if (!q || !q.public_link_enabled || !q.client_id) return null;
  const access = await evaluateLinkAccess(supabaseAdmin, q.client_id, [q.client_access_password], { ...body, password: body.password || "" });
  if (!access.ok) return null;
  return { clientId: q.client_id, workspaceId: q.workspace_id };
}

async function fromLink(token: string) {
  if (token.length < 16) return null;
  const { data: rows } = await supabaseAdmin.from("clients").select("id, workspace_id, name").eq("review_token", token).limit(1);
  const c = rows?.[0];
  return c ? { clientId: c.id, workspaceId: c.workspace_id, clientName: c.name || "" } : null;
}

async function fromSession(sessionToken: string, clientId: string) {
  if (!sessionToken || !UUID.test(clientId)) return null;
  const { data: rows } = await supabaseAdmin.from("clients").select("id, workspace_id")
    .eq("id", clientId).eq("portal_access_token", sessionToken).eq("portal_access_enabled", true).limit(1);
  const c = rows?.[0];
  return c ? { clientId: c.id, workspaceId: c.workspace_id } : null;
}

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "");
    const token = String(body.token || "").slice(0, 200);

    let who: { clientId: string; workspaceId: string; clientName?: string } | null = null;
    if (mode === "track") who = token ? await fromTrack(token) : null;
    else if (mode === "portal") who = token ? await fromPortal(token, body) : null;
    else if (mode === "link") who = token ? await fromLink(token) : null;
    else if (mode === "client") who = await fromSession(String(body.session_token || ""), String(body.client_id || ""));
    else return Response.json({ error: "Unknown request" }, { status: 400 });
    if (!who) return Response.json({ error: UNAVAILABLE }, { status: 403 });

    const { data: ws } = await supabaseAdmin.from("workspaces")
      .select("id, timezone, owner_user_id, name, logo, tagline, public_profile_slug, public_profile_enabled, date_format, plan_status")
      .eq("id", who.workspaceId).single();
    // A suspended business takes nothing from its public links (same rule as signing and inquiries): no review card.
    const ctx = await resolvePlanContext(who.workspaceId);
    if (ctx.suspended) {
      if (body.action === "get" && mode !== "link") return Response.json({ review: null });
      return Response.json({ error: "This business can't take reviews right now." }, { status: 403 });
    }
    const anytime = mode === "link";
    const before = await clientReviewState(who.clientId, who.workspaceId, ws?.timezone, anytime);
    if (body.action === "get") {
      if (mode !== "link") return Response.json({ review: before });
      return Response.json({
        review: before,
        client_name: who.clientName || "",
        business: {
          name: ws?.name || "", logo: ws?.logo || "", tagline: ws?.tagline || "", date_format: ws?.date_format || "",
          profile_slug: ws?.public_profile_enabled ? (ws.public_profile_slug || "") : "",
        },
      });
    }

    // ---- Write / edit ----
    const rating = Math.round(Number(body.rating));
    if (!(rating >= 1 && rating <= 5)) return Response.json({ error: "Please choose from 1 to 5 stars." }, { status: 400 });
    const text = String(body.review || "").replace(/\r\n/g, "\n").trim().slice(0, REVIEW_MAX_LENGTH);
    if (!before.open) return Response.json({ error: "You can leave a review once it is over." }, { status: 400 });

    const isEdit = !!before.rating;
    // Saved without changing anything: nothing is written (it would mark it "Edited" and move it up), nobody is told.
    if (isEdit && before.rating === rating && before.review === text) return Response.json({ ok: true, review: before });
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { review_rating: rating, review_text: text, review_updated_at: now };
    if (!isEdit) update.review_created_at = now;
    const { data: client, error } = await supabaseAdmin.from("clients").update(update)
      .eq("id", who.clientId).eq("workspace_id", who.workspaceId).select("id, name").maybeSingle();
    if (error) throw error;
    if (!client) return Response.json({ error: UNAVAILABLE }, { status: 403 });

    // Tell the owner, in the background (the client is already told it went through). Edits within 10 minutes of the
    // last one are not announced again, so a client trying a few versions (or someone with the link) can't flood the bell.
    // A change of stars is always announced, so the bell never keeps showing an old rating.
    const recentEdit = isEdit && before.rating === rating && before.reviewed_at && Date.now() - new Date(before.reviewed_at).getTime() < 10 * 60 * 1000;
    const changed = !recentEdit;
    // Preferences → Notifications: "Client reviews" switch (a missing key counts as on). In-app and Push are separate
    // channels, as in the rest of Preferences: the bell needs In-app on, the push needs Push on (and Pro).
    const notify = async () => {
      if (!ws?.owner_user_id || !changed) return;
      const { data: prof } = await supabaseAdmin.from("profiles").select("notification_preferences").eq("id", ws.owner_user_id).single();
      const send = reviewNotifyChannels(prof?.notification_preferences, ctx.limits?.notifications_enabled === true, changed);
      if (!send.bell && !send.push) return;
      const name = client.name || "A client";
      const title = isEdit ? `${name} updated their review (${rating}★)` : `New ${rating}★ review from ${name}`;
      const message = text ? `"${text.length > 100 ? `${text.slice(0, 100)}…` : text}"` : "Stars only, no written review.";
      if (send.bell) {
        const { error: bellError } = await supabaseAdmin.from("notifications").insert({
          workspace_id: who!.workspaceId, user_id: ws.owner_user_id, type: "general", title, message,
          related_entity_type: "clients", related_entity_id: who!.clientId, read: false, created_by_id: ws.owner_user_id,
        });
        if (bellError) console.error("review bell entry failed", bellError);
      }
      try {
        if (send.push) {
          await sendPushToUser(ws.owner_user_id, title, message, { entity_type: "clients", entity_id: who!.clientId, url: `/clients/${who!.clientId}` }, `review:${who!.clientId}`, who!.workspaceId);
        }
      } catch { /* push is optional */ }
    };
    const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    const work = notify().catch((e) => console.error("review notification failed", e));
    if (rt?.waitUntil) rt.waitUntil(work); else await work;

    return Response.json({ ok: true, review: await clientReviewState(who.clientId, who.workspaceId, ws?.timezone, anytime) });
  } catch (error) {
    console.error("submitEventReview failed", error);
    return Response.json({ error: "Couldn't save your review. Please try again." }, { status: 500 });
  }
}));
