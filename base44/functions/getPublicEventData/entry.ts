// getPublicEventData — Public event tracking page by token.
// Ported from supabase/functions/getPublicEventData — uses Supabase admin client.
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const { data: events } = await supabaseAdmin.from("events").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    const event = (events && events.length > 0) ? events[0] : null;
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
    if (!event.public_tracking_enabled) return Response.json({ error: "Tracking is not enabled for this event." }, { status: 403 });
    if (event.status === "cancelled") return Response.json({ error: "This event has been cancelled." }, { status: 404 });

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", event.workspace_id).single();
    let client = null;
    if (event.client_id) {
      const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", event.client_id).single();
      client = c;
    }
    const { data: transactions } = await supabaseAdmin
      .from("financial_transactions")
      .select("*")
      .eq("workspace_id", event.workspace_id).eq("event_id", event.id)
      .eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE")
      .order("transaction_date", { ascending: false }).limit(200);
    const { data: assignments } = await supabaseAdmin
      .from("event_team_assignments")
      .select("*")
      .eq("workspace_id", event.workspace_id).eq("event_id", event.id)
      .eq("assignment_status", "assigned")
      .order("created_at", { ascending: true }).limit(100);
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("workspace_id", event.workspace_id).eq("status", "active")
      .order("name", { ascending: true }).limit(200);
    const { data: quotations } = await supabaseAdmin
      .from("quotations")
      .select("*")
      .eq("workspace_id", event.workspace_id).eq("event_id", event.id)
      .in("status", ["finalized", "accepted"])
      .order("created_at", { ascending: false }).limit(10);

    const membersById = {};
    (members || []).forEach((m) => { membersById[m.id] = m; });
    const team = (assignments || []).map((a) => {
      const m = membersById[a.team_member_id];
      return { name: m?.name || "Team Member", profession: m?.profession || a.role_name_snapshot || "", role: a.role_name_snapshot || "" };
    });

    const contractValue = Number(event.contract_value) || 0;
    const received = (transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pending = Math.max(0, contractValue - received);
    const paymentProgress = contractValue > 0 ? Math.min(100, Math.round((received / contractValue) * 100)) : 0;

    const sortedQuotations = (quotations || []).slice().sort((a, b) => {
      const aAccepted = a.status === "accepted" ? 1 : 0;
      const bAccepted = b.status === "accepted" ? 1 : 0;
      return bAccepted - aAccepted;
    });
    const resolvedQuotation = sortedQuotations[0] || null;

    let quotation = null;
    if (resolvedQuotation) {
      let publicToken = resolvedQuotation.public_token || "";
      if (!publicToken) {
        const tokenBytes = new Uint8Array(24);
        crypto.getRandomValues(tokenBytes);
        publicToken = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        await supabaseAdmin.from("quotations").update({ public_token: publicToken }).eq("id", resolvedQuotation.id);
      }
      quotation = { id: resolvedQuotation.id, public_token: publicToken, quotation_number: resolvedQuotation.quotation_number, status: resolvedQuotation.status, grand_total: Number(resolvedQuotation.grand_total) || 0 };
    }

    const today = new Date().toISOString().slice(0, 10);
    const eventDates = event.event_dates && event.event_dates.length > 0 ? event.event_dates : [event.start_date, event.end_date].filter(Boolean);
    const firstDate = eventDates[0] || event.start_date;
    const lastDate = eventDates[eventDates.length - 1] || event.end_date || event.start_date;

    let milestones = [];
    if (event.status === "upcoming") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        { label: "Planning & Coordination", done: firstDate && today < firstDate, date: null },
        { label: "Event Day", done: false, date: firstDate },
        { label: "Delivery & Wrap-up", done: false, date: null }
      ];
    } else if (event.status === "in-progress") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: false, date: null }
      ];
    } else if (event.status === "completed") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: true, date: lastDate }
      ];
    }

    return Response.json({
      event: {
        id: event.id, title: event.title, event_type: event.event_type || "",
        start_date: event.start_date, end_date: event.end_date,
        event_dates: event.event_dates || [], venue: event.venue || "",
        venue_address: event.venue_address || "", status: event.status,
        contract_value: contractValue, description: event.description || ""
      },
      business: {
        name: workspace?.name || "", logo: workspace?.logo || "", phone: workspace?.phone || "",
        email: workspace?.email || "", address: workspace?.address || "", city: workspace?.city || "",
        custom_work_label_singular: workspace?.custom_work_label_singular || "",
        custom_work_label_plural: workspace?.custom_work_label_plural || "",
        business_category: workspace?.business_category || "OTHER"
      },
      client: client ? { name: client.name || "" } : null,
      payment: { contract_value: contractValue, received, pending, progress: paymentProgress, currency: workspace?.currency || "INR" },
      team, quotation, milestones
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}