import { withCors } from "../_shared/cors.ts";
// getPortalData — Public Client Project Portal (URL 1) data by token.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { evaluateLinkAccess, UNSECURED_MESSAGE } from "../_shared/linkAccess.ts";
import { round2, filterTeamItems, filterServiceItems, buildMilestoneStates, safeJson } from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    const providedPassword = body.password || "";
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const { data: list } = await supabaseAdmin
      .from("quotations")
      .select("*")
      .eq("public_token", token)
      .order("created_at", { ascending: false })
      .limit(5);
    if (!list || list.length === 0) return Response.json({ error: "Project not found" }, { status: 404 });
    const q = list[0];

    if (!q.public_link_enabled) {
      return Response.json({ unavailable: true, message: "This project link is currently unavailable." });
    }
    const access = await evaluateLinkAccess(supabaseAdmin, q.client_id, [q.client_access_password], { ...body, password: providedPassword });
    if (!access.ok) {
      if (access.reason === "unsecured") return Response.json({ error: UNSECURED_MESSAGE, unsecured: true }, { status: 403 });
      return Response.json({ requires_password: true });
    }

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(q.portal_view_count) || 0) + 1;
      const firstViewed = q.portal_first_viewed_at || now;
      supabaseAdmin.from("quotations").update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).eq("id", q.id).then(() => {}, () => {});
    }

    let event = null, client = null, business = null, milestones = [];
    event = safeJson(q.event_snapshot);
    client = safeJson(q.client_snapshot);
    business = safeJson(q.business_snapshot);
    milestones = safeJson(q.payment_schedule_json) || [];

    const { data: items } = await supabaseAdmin.from("quotation_items").select("*").eq("quotation_id", q.id).order("sort_order", { ascending: true }).limit(500);

    let currency = "INR";
    const { data: ws } = await supabaseAdmin.from("workspaces").select("currency").eq("id", q.workspace_id).single();
    if (ws?.currency) currency = ws.currency;

    const grandTotal = Number(q.grand_total) || 0;
    const { milestoneStates, totalReceived } = await buildMilestoneStates(supabaseAdmin, q, milestones);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const eventStart = (event?.start_date || q.start_date) ? new Date((event?.start_date || q.start_date) + "T00:00:00") : null;
    const eventEnd = (event?.end_date || q.end_date) ? new Date((event?.end_date || q.end_date) + "T00:00:00") : null;

    let currentStage = 0;
    if (q.status === "accepted") {
      if (eventEnd && today > eventEnd) currentStage = 4;
      else if (eventStart && today >= eventStart) currentStage = 3;
      else currentStage = 2;
    } else if (q.status === "finalized") {
      currentStage = 1;
    }

    // Valid through the whole "valid until" day (end of day, not its first second).
    const expired = q.valid_until && new Date(q.valid_until + "T23:59:59.999") < today;
    const hideTeamNames = !!q.hide_team_names;
    const templateConfig = safeJson(q.template_config) || {};
    const quotationMode = templateConfig.mode === "regular" ? "regular" : "day_wise";

    // For team items `name` is the member's name; the role is in `description`.
    // When names are hidden they never leave the server.
    // Includes / Deliverables are flagged by phase_title and shown in their own card, never mixed into team/services.
    const isInclude = (it: any) => it.phase_title === "__includes__";
    const dayItems = (items || []).filter((it: any) => !isInclude(it));
    const includes = (items || []).filter(isInclude).map((it: any) => ({
      name: it.name || "", description: it.description || "",
      quantity: Math.max(1, Number(it.quantity) || 1), is_addon: !!it.is_addon,
    }));
    const team = filterTeamItems(dayItems).map((it) => ({
      role: it.description || (hideTeamNames ? "Team Member" : (it.name || "Team Member")),
      name: hideTeamNames ? "" : (it.team_member_name_snapshot || (it.name && it.name !== it.description ? it.name : "")),
      quantity: Math.max(1, Number(it.quantity) || 1), member_type: hideTeamNames ? "" : (it.member_type || ""), hide: hideTeamNames,
      day_date: it.day_date || "", phase_title: it.phase_title || ""
    }));
    const services = filterServiceItems(dayItems).map((it) => ({
      name: it.name || "", description: it.description || "", is_addon: !!it.is_addon,
      day_date: it.day_date || "", phase_title: it.phase_title || ""
    }));

    // Custom items (anything that isn't a team member or a service) were missing from the portal.
    const customItems = dayItems
      .filter((it) => it.item_type !== "team" && it.item_type !== "service")
      .map((it) => ({
        name: it.name || "", description: it.description || "",
        day_date: it.day_date || "", phase_title: it.phase_title || ""
      }));

    let quotationCardState = "draft";
    if (q.status === "accepted") quotationCardState = "signed";
    else if (q.status === "finalized" && expired) quotationCardState = "expired";
    else if (q.status === "finalized") quotationCardState = "pending";

    return Response.json({
      project: {
        title: q.project_title || event?.title || "", category: q.category || "", context_type: q.context_type || "",
        event_date: event?.start_date || q.start_date || "", event_end_date: event?.end_date || q.end_date || "",
        event_dates: Array.isArray(event?.event_dates) && event.event_dates.length > 0 ? event.event_dates : [event?.start_date || q.start_date || ""].filter(Boolean),
        venue: event?.venue || "", venue_address: event?.venue_address || ""
      },
      quotation: {
        id: q.id, public_token: q.public_token || "", quotation_number: q.quotation_number, status: q.status,
        grand_total: grandTotal, valid_until: q.valid_until || "", expired: !!expired, card_state: quotationCardState,
        signed_at: q.signed_at || "", signed_by_name: q.signed_by_name || ""
      },
      timeline: { current_stage: currentStage, stages: [{ label: "Booking Confirmed", step: 1 }, { label: "Planning", step: 2 }, { label: "Event Day", step: 3 }, { label: "Delivery", step: 4 }] },
      milestones: milestoneStates, total_received: round2(totalReceived), team, services, custom_items: customItems, includes, currency, hide_team_names: hideTeamNames, quotation_mode: quotationMode,
      business_name: business?.name || "", business_logo: business?.logo || "",
      business_date_format: business?.date_format || "", business_number_format: business?.number_format || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));