import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';
import { round2, filterTeamItems, filterServiceItems, calculateMilestoneAmount } from '../../shared/quotationHelpers.ts';

// Public, unauthenticated endpoint: returns the Client Project Portal (URL 1) data.
// Looked up by a secure random public_token — never exposes internal IDs.
// Records view tracking (first/latest viewed timestamp + view count).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    // Find quotation by public_token (service role — public, no auth)
    const list = await base44.asServiceRole.entities.Quotation.filter(
      { public_token: token }, "-created_date", 5
    );
    if (!list || list.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const q = list[0];

    // Admin master control — if public link is disabled, show unavailable message
    if (!q.public_link_enabled) {
      return Response.json({ unavailable: true, message: "This project link is currently unavailable." });
    }

    // Record view tracking (non-blocking via waitUntil) — skip for admin previews
    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(q.portal_view_count) || 0) + 1;
      const firstViewed = q.portal_first_viewed_at || now;
      waitUntil(
        base44.asServiceRole.entities.Quotation.update(q.id, {
          portal_view_count: viewCount,
          portal_first_viewed_at: firstViewed,
          portal_latest_viewed_at: now
        }).catch(() => {})
      );
    }

    // Parse snapshots
    let event = null, client = null, business = null, milestones = [];
    try { event = q.event_snapshot ? JSON.parse(q.event_snapshot) : null; } catch (e) {}
    try { client = q.client_snapshot ? JSON.parse(q.client_snapshot) : null; } catch (e) {}
    try { business = q.business_snapshot ? JSON.parse(q.business_snapshot) : null; } catch (e) {}
    try { milestones = q.payment_schedule_json ? JSON.parse(q.payment_schedule_json) : []; } catch (e) {}

    // Get quotation items
    const items = await base44.asServiceRole.entities.QuotationItem.filter(
      { quotation_id: q.id }, "sort_order", 500
    );

    // Resolve workspace currency
    let currency = "INR";
    try {
      const ws = await base44.asServiceRole.entities.Workspace.get(q.workspace_id);
      if (ws?.currency) currency = ws.currency;
    } catch (e) { /* default INR */ }

    // Get actual client receipts for the event to determine milestone payment states
    let totalReceived = 0;
    if (q.event_id) {
      try {
        const txns = await base44.asServiceRole.entities.FinancialTransaction.filter(
          { event_id: q.event_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
          "transaction_date", 500
        );
        totalReceived = (txns || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      } catch (e) { /* no transactions */ }
    }

    // Calculate milestone states — mark Paid only when actual transactions cover the amount
    const grandTotal = Number(q.grand_total) || 0;
    const milestoneStates = [];
    let remaining = totalReceived;
    for (const m of milestones) {
      if (!m.name) continue;
      const amount = calculateMilestoneAmount(m, grandTotal);
      if (amount > 0 && remaining >= amount) {
        milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: true });
        remaining = round2(remaining - amount);
      } else {
        milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: false });
      }
    }

    // Determine timeline stage
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const eventStart = (event?.start_date || q.start_date) ? new Date((event?.start_date || q.start_date) + "T00:00:00") : null;
    const eventEnd = (event?.end_date || q.end_date) ? new Date((event?.end_date || q.end_date) + "T00:00:00") : null;

    let currentStage = 0; // 0 = before booking confirmed
    if (q.status === "accepted") {
      if (eventEnd && today > eventEnd) currentStage = 4;       // Delivery
      else if (eventStart && today >= eventStart) currentStage = 3; // Event Day
      else currentStage = 2;                                      // Planning
    } else if (q.status === "finalized") {
      currentStage = 1; // Booking Confirmed (awaiting acceptance)
    }

    // Check expired
    const expired = q.valid_until && new Date(q.valid_until + "T00:00:00") < today;

    // Build team section — roles first, names second
    const hideTeamNames = !!q.hide_team_names;
    const team = filterTeamItems(items).map((it) => ({
      role: it.name || "",
      name: hideTeamNames ? "" : (it.team_member_name_snapshot || ""),
      quantity: Math.max(1, Number(it.quantity) || 1),
      member_type: it.member_type || "",
      hide: hideTeamNames
    }));

    // Build service section
    const services = filterServiceItems(items).map((it) => ({
      name: it.name || "",
      description: it.description || ""
    }));

    // Determine quotation card state
    let quotationCardState = "draft";
    if (q.status === "accepted") quotationCardState = "signed";
    else if (q.status === "finalized" && expired) quotationCardState = "expired";
    else if (q.status === "finalized") quotationCardState = "pending";

    return Response.json({
      project: {
        title: q.project_title || event?.title || "",
        category: q.category || "",
        context_type: q.context_type || "",
        event_date: event?.start_date || q.start_date || "",
        event_end_date: event?.end_date || q.end_date || "",
        venue: event?.venue || "",
        venue_address: event?.venue_address || ""
      },
      quotation: {
        id: q.id,
        public_token: q.public_token || "",
        quotation_number: q.quotation_number,
        status: q.status,
        grand_total: grandTotal,
        valid_until: q.valid_until || "",
        expired: !!expired,
        card_state: quotationCardState,
        signed_at: q.signed_at || "",
        signed_by_name: q.signed_by_name || ""
      },
      timeline: {
        current_stage: currentStage,
        stages: [
          { label: "Booking Confirmed", step: 1 },
          { label: "Planning", step: 2 },
          { label: "Event Day", step: 3 },
          { label: "Delivery", step: 4 }
        ]
      },
      milestones: milestoneStates,
      total_received: round2(totalReceived),
      team,
      services,
      currency,
      hide_team_names: hideTeamNames,
      business_name: business?.name || "",
      business_logo: business?.logo || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// round2, filterTeamItems, filterServiceItems, calculateMilestoneAmount imported from shared/quotationHelpers.ts