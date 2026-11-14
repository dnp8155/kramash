import { withCors } from "../_shared/cors.ts";
import { todayInTz } from "../_shared/helpers.ts";
// getPublicEventData — Public "track" page by token: the event's basics and the status of each item being made.
// Status only: no money, team or quotation details are returned.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { resolvePlanContext } from "../_shared/planEngine.ts";
import { trackSettings } from "../_shared/trackSettings.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const { data: events } = await supabaseAdmin.from("events").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    const event = (events && events.length > 0) ? events[0] : null;
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
    if (!event.public_tracking_enabled) return Response.json({ error: "Tracking is not enabled for this event." }, { status: 403 });
    if (event.status === "cancelled") return Response.json({ error: "This event has been cancelled." }, { status: 404 });

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", event.workspace_id).single();
    // Track is part of the portals (Pro) and the business can turn it off in Preferences.
    const track = trackSettings(workspace);
    const plan = await resolvePlanContext(event.workspace_id);
    if (plan.planCode !== "PRO" || !track.enabled) return Response.json({ error: "Tracking is not enabled for this event." }, { status: 403 });
    let client = null;
    if (event.client_id) {
      const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", event.client_id).single();
      client = c;
    }
    const { data: items } = await supabaseAdmin
      .from("event_deliverables")
      .select("id,title,quantity,status,note,expected_date,updated_at")
      .eq("workspace_id", event.workspace_id).eq("event_id", event.id)
      .order("created_at", { ascending: true }).limit(200);

    const today = todayInTz(workspace?.timezone);
    const eventDates = event.event_dates && event.event_dates.length > 0 ? event.event_dates : [event.start_date, event.end_date].filter(Boolean);
    const firstDate = eventDates[0] || event.start_date;
    const lastDate = eventDates[eventDates.length - 1] || event.end_date || event.start_date;

    // Delivery counts as done (with no Track items still open) once the event is marked Completed, or once the client
    // has paid in full / the dues were marked settled. Only a yes/no and a date leave the server, never amounts.
    const openItems = (items || []).filter((i) => i.status !== "delivered").length;
    let paidInFull = !!event.settled;
    let paidOn: string | null = event.settled && event.settled_at ? String(event.settled_at).slice(0, 10) : null;
    if (!paidInFull && Number(event.contract_value) > 0) {
      const { data: receipts } = await supabaseAdmin
        .from("financial_transactions")
        .select("amount,transaction_date")
        .eq("workspace_id", event.workspace_id).eq("event_id", event.id)
        .eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE")
        .limit(1000);
      const paid = (receipts || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      if (paid + 0.005 >= Number(event.contract_value)) {
        paidInFull = true;
        paidOn = (receipts || []).map((r) => String(r.transaction_date || "").slice(0, 10)).filter(Boolean).sort().pop() || null;
      }
    }
    const started = event.status === "in-progress" || event.status === "completed" || (!!firstDate && today >= firstDate);
    const deliveryDone = openItems === 0 && started && (event.status === "completed" || paidInFull);
    // Completed events have no "completed on" date stored, so the last payment (or the last event day) stands in.
    // (capped at today: an event marked Completed before its last date must not show a future date)
    const fallbackDate = lastDate && lastDate > today ? today : lastDate;
    const deliveryDate = deliveryDone ? (paidOn || fallbackDate || null) : null;
    // Why it is done, for the line under the step: "settled", "paid" (in full) or "completed" (marked Completed).
    const deliveryHow = !deliveryDone ? null : event.settled ? "settled" : paidInFull ? "paid" : "completed";

    let milestones = [];
    if (event.status === "upcoming") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        // Planning also counts as done once the event day has begun (status not moved on yet), so the steps stay in order.
        { label: "Planning & Coordination", done: (!!firstDate && today < firstDate) || started, date: null },
        { label: "Event Day", done: started, date: firstDate },
        { label: "Delivery & Wrap-up", done: deliveryDone, date: deliveryDate, how: deliveryHow }
      ];
    } else if (event.status === "in-progress") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: deliveryDone, date: deliveryDate, how: deliveryHow }
      ];
    } else if (event.status === "completed") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_at?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: deliveryDone, date: deliveryDate, how: deliveryHow }
      ];
    }

    return Response.json({
      event: {
        id: event.id, title: event.title, event_type: event.event_type || "",
        start_date: event.start_date, end_date: event.end_date,
        event_dates: event.event_dates || [], venue: event.venue || "",
        venue_address: event.venue_address || "", status: event.status,
        description: event.description || ""
      },
      business: {
        id: workspace?.id || "", tagline: workspace?.tagline || "", date_format: workspace?.date_format || "", number_format: workspace?.number_format || "",
        name: workspace?.name || "", logo: workspace?.logo || "", phone: workspace?.phone || "",
        email: workspace?.email || "", address: workspace?.address || "", city: workspace?.city || "",
        custom_work_label_singular: workspace?.custom_work_label_singular || "",
        custom_work_label_plural: workspace?.custom_work_label_plural || "",
        business_category: workspace?.business_category || "OTHER"
      },
      client: client ? { name: client.name || "" } : null,
      items: (items || []).map((i) => ({ id: i.id, title: i.title, quantity: Number(i.quantity) || 1, status: i.status, note: i.note || "", expected_date: i.expected_date || "", updated_at: i.updated_at })),
      track_labels: track.labels,
      milestones
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
