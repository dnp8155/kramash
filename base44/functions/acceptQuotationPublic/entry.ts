import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public endpoint — accepts a quotation via the public portal token.
// No auth required; the token authorizes the action. Read-only on
// everything except the quotation status (Draft/Finalized → Accepted).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const token = body?.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Find portal by token
    const portals = await base44.asServiceRole.entities.QuotationPortal.filter({
      public_token: token,
    });
    if (!portals || portals.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const portal = portals[0];

    if (!portal.is_enabled) {
      return Response.json({ error: "disabled", message: "This project link is currently unavailable." }, { status: 403 });
    }

    // Get quotation
    const quotation = await base44.asServiceRole.entities.Quotation.get(portal.quotation_id);
    if (!quotation) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Guard: already accepted
    if (quotation.status === "Accepted") {
      return Response.json({ error: "This quotation has already been accepted." }, { status: 400 });
    }

    // Guard: expired
    if (quotation.valid_until && new Date(quotation.valid_until) < new Date()) {
      return Response.json({ error: "This quotation has expired and can no longer be accepted." }, { status: 400 });
    }

    // Guard: must be finalized first (not Draft)
    if (quotation.status === "Draft") {
      return Response.json({ error: "This quotation is not yet ready for acceptance." }, { status: 400 });
    }

    // Build snapshots if not already present (for historical accuracy)
    const updates: any = { status: "Accepted" };

    if (!quotation.client_snapshot) {
      if (quotation.client_id) {
        const c = await base44.asServiceRole.entities.Client.get(quotation.client_id);
        if (c) {
          updates.client_snapshot = {
            name: c.name, phone: c.phone, email: c.email,
            address: [c.address, c.city, c.state].filter(Boolean).join(", "),
          };
        }
      } else if (quotation.custom_client) {
        updates.client_snapshot = {
          name: quotation.custom_client.name,
          phone: quotation.custom_client.phone,
          email: quotation.custom_client.email,
          address: quotation.custom_client.address,
        };
      }
    }

    if (!quotation.business_snapshot) {
      const ws = await base44.asServiceRole.entities.Workspace.get(quotation.workspace_id);
      if (ws) {
        updates.business_snapshot = {
          name: ws.name, logo: ws.logo,
          address: [ws.address, ws.city, ws.state].filter(Boolean).join(", "),
          phone: ws.phone, email: ws.email,
          gst_business_name: ws.gst_business_name, gstin: ws.gstin,
          gst_billing_address: ws.gst_billing_address, gst_state: ws.gst_state,
        };
      }
    }

    if (!quotation.event_snapshot && quotation.event_id) {
      const ev = await base44.asServiceRole.entities.Event.get(quotation.event_id);
      if (ev) {
        updates.event_snapshot = {
          title: ev.title, start_date: ev.start_date, end_date: ev.end_date,
          venue: ev.venue, venue_address: ev.venue_address,
        };
      }
    }

    // Update quotation status
    await base44.asServiceRole.entities.Quotation.update(quotation.id, updates);

    // Sync event contract value
    if (quotation.event_id && quotation.grand_total) {
      try {
        await base44.asServiceRole.entities.Event.update(quotation.event_id, {
          contract_value: quotation.grand_total,
        });
      } catch {}
    }

    return Response.json({ success: true, quotation_id: quotation.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}