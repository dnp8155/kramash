// getPortalData — Public Client Project Portal (URL 1) data by token.
// Ported from supabase/functions/getPortalData — uses Supabase admin client.
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import { round2, filterTeamItems, filterServiceItems, calculateMilestoneAmount, safeJson } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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
    if (q.client_access_password) {
      if (!providedPassword || providedPassword !== q.client_access_password) {
        return Response.json({ requires_password: true });
      }
    }

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(q.portal_view_count) || 0) + 1;
      const firstViewed = q.portal_first_viewed_at || now;
      supabaseAdmin.from("quotations").update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).eq("id", q.id).then(() => {}, () => {});
    }

    let event = safeJson(q.event_snapshot);
    let client = safeJson(q.client_snapshot);
    let business = safeJson(q.business_snapshot);
    let milestones = safeJson(q.payment_schedule_json) || [];

    const { data: items } = await supabaseAdmin.from("quotation_items").select("*").eq("quotation_id", q.id).order("sort_order", { ascending: true }).limit(500);

    let currency = "INR";
    const { data: ws } = await supabaseAdmin.from("workspaces").select("currency").eq("id", q.workspace_id).single();
    if (ws?.currency) currency = ws.currency;

    let totalReceived = 0;
    if (q.event_id) {
      const { data: txns } = await supabaseAdmin
        .from("financial_transactions")
        .select("*")
        .eq("event_id", q.event_id)
        .eq("transaction_type", "CLIENT_RECEIPT")
        .eq("status", "ACTIVE")
        .order("transaction_date", { ascending: true })
        .limit(500);
      totalReceived = (txns || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }

    const grandTotal = Number(q.grand_total) || 0;
    let milestoneStates = [];

    if (q.event_id) {
      const { data: dbMilestones } = await supabaseAdmin
        .from("payment_milestones")
        .select("*")
        .eq("workspace_id", q.workspace_id)
        .eq("event_id", q.event_id)
        .order("sort_order", { ascending: true })
        .limit(100);
      if (dbMilestones && dbMilestones.length > 0) {
        milestoneStates = dbMilestones.map((m) => {
          const due = Number(m.due_amount) || 0;
          const paid = Number(m.paid_amount) || 0;
          return { name: m.name || "", amount: round2(due), due_date: m.due_date || "", paid: due > 0 && paid >= due, paid_amount: round2(paid), status: m.status || "upcoming" };
        });
      }
    }

    if (milestoneStates.length === 0 && milestones.length > 0) {
      let remaining = totalReceived;
      for (const m of milestones) {
        if (!m.name) continue;
        const amount = calculateMilestoneAmount(m, grandTotal);
        if (amount > 0 && remaining >= amount) {
          milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: true, paid_amount: amount, status: "paid" });
          remaining = round2(remaining - amount);
        } else {
          milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: false, paid_amount: round2(Math.max(0, remaining)), status: remaining > 0 ? "partially_paid" : "upcoming" });
          remaining = 0;
        }
      }
    }

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

    const expired = q.valid_until && new Date(q.valid_until + "T00:00:00") < today;
    const hideTeamNames = !!q.hide_team_names;

    const rawTeamItems = filterTeamItems(items);
    let team;
    if (hideTeamNames) {
      // Merge team members that share the same role into a single "N × Role" row
      // so no individual is identifiable, matching the quotation link behavior.
      const groups = new Map();
      for (const it of rawTeamItems) {
        const role = it.description || it.name || "Team Member";
        const key = `${role}|${it.unit_rate}|${it.rate_type}|${it.member_type || ""}`;
        const qty = Math.max(1, Number(it.quantity) || 1);
        if (groups.has(key)) {
          groups.get(key).quantity += qty;
        } else {
          groups.set(key, { role, name: "", quantity: qty, member_type: it.member_type || "", hide: true });
        }
      }
      team = Array.from(groups.values());
    } else {
      team = rawTeamItems.map((it) => ({
        role: it.description || it.name || "",
        name: it.team_member_name_snapshot || "",
        quantity: Math.max(1, Number(it.quantity) || 1), member_type: it.member_type || "", hide: false
      }));
    }
    const services = filterServiceItems(items).map((it) => ({
      name: it.name || "",
      // Service descriptions can carry a provider's name (e.g. "Provider: X") — strip when hiding team names.
      description: hideTeamNames ? "" : (it.description || "")
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
      milestones: milestoneStates, total_received: round2(totalReceived), team, services, currency, hide_team_names: hideTeamNames,
      business_name: business?.name || "", business_logo: business?.logo || "", client_name: client?.name || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}