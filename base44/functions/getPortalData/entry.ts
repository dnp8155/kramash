import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { safeJson, round2, filterTeamItems, filterServiceItems, calculateMilestoneAmount } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    const providedPassword = body.password || "";
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const list = await base44.asServiceRole.entities.Quotation.filter({ public_token: token }, "-created_date", 5);
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
      base44.asServiceRole.entities.Quotation.update(q.id, { portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).catch(() => {});
    }

    let event = safeJson(q.event_snapshot);
    let client = safeJson(q.client_snapshot);
    let business = safeJson(q.business_snapshot);
    let milestones = safeJson(q.payment_schedule_json) || [];

    const items = await base44.asServiceRole.entities.QuotationItem.filter({ quotation_id: q.id }, "sort_order", 500);

    let currency = "INR";
    try {
      const ws = await base44.asServiceRole.entities.Workspace.get(q.workspace_id);
      if (ws?.currency) currency = ws.currency;
    } catch {}

    let totalReceived = 0;
    if (q.event_id) {
      const txns = await base44.asServiceRole.entities.FinancialTransaction.filter(
        { event_id: q.event_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
        "transaction_date", 500
      );
      totalReceived = (txns || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }

    const grandTotal = Number(q.grand_total) || 0;
    let milestoneStates = [];

    if (q.event_id) {
      const dbMilestones = await base44.asServiceRole.entities.PaymentMilestone.filter(
        { workspace_id: q.workspace_id, event_id: q.event_id }, "sort_order", 100
      );
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

    const team = filterTeamItems(items).map((it) => ({
      role: it.name || "", name: hideTeamNames ? "" : (it.team_member_name_snapshot || ""),
      quantity: Math.max(1, Number(it.quantity) || 1), member_type: it.member_type || "", hide: hideTeamNames
    }));
    const services = filterServiceItems(items).map((it) => ({ name: it.name || "", description: it.description || "" }));

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
      business_name: business?.name || "", business_logo: business?.logo || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}