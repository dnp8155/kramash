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

    // Extract signature data from the request body
    const signedByName = body?.signed_by_name;
    const signatureData = body?.signature_data;
    const signatureType = body?.signature_type;

    if (!signedByName || typeof signedByName !== "string" || signedByName.trim().length < 2) {
      return Response.json({ error: "Legal name is required to sign the quotation." }, { status: 400 });
    }
    if (!signatureData || typeof signatureData !== "string" || signatureData.length < 2) {
      return Response.json({ error: "Signature is required to accept the quotation." }, { status: 400 });
    }
    if (!["drawn", "typed"].includes(signatureType)) {
      return Response.json({ error: "Invalid signature type." }, { status: 400 });
    }

    // Build snapshots if not already present (for historical accuracy)
    const updates: any = {
      status: "Accepted",
      signed_at: new Date().toISOString(),
      signed_by_name: signedByName.trim(),
      signature_data: signatureData,
      signature_type: signatureType,
    };

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

    // ─── Synchronization workflow ───
    // On acceptance, sync the quotation to the Event and Financials architecture.
    // Creates/updates the Event, team assignments, service assignments, and payment
    // milestones (dues). No FinancialTransaction is created — acceptance ≠ payment.

    const quotationItems = await base44.asServiceRole.entities.QuotationItem.filter(
      { quotation_id: quotation.id },
      "sort_order",
      500
    );

    // 1. Event creation/update (duplicate prevention via quotation.event_id)
    let eventId = quotation.event_id;
    if (!eventId) {
      let clientId = quotation.client_id;
      if (!clientId && quotation.custom_client) {
        const newClient = await base44.asServiceRole.entities.Client.create({
          workspace_id: quotation.workspace_id,
          name: quotation.custom_client.name,
          phone: quotation.custom_client.phone || "",
          email: quotation.custom_client.email || "",
          address: quotation.custom_client.address || "",
        });
        clientId = newClient.id;
      }

      const eventTitle =
        quotation.event_snapshot?.title ||
        quotation.custom_client?.venue ||
        quotation.package_name ||
        `Project ${quotation.quotation_number}`;

      const eventTypeMap: Record<string, string> = {
        PHOTOGRAPHY_VIDEOGRAPHY: "Photography",
        EVENT_MANAGEMENT: "Event Management",
        ARCHITECTURE_INTERIOR: "Architecture",
        OTHER: "Other",
      };

      const newEvent = await base44.asServiceRole.entities.Event.create({
        workspace_id: quotation.workspace_id,
        client_id: clientId,
        title: eventTitle,
        event_type: eventTypeMap[quotation.category] || "Other",
        start_date: quotation.project_start_date || quotation.quotation_date,
        end_date: quotation.project_end_date || null,
        venue: quotation.event_snapshot?.venue || quotation.custom_client?.venue || "",
        venue_address: quotation.event_snapshot?.venue_address || "",
        status: "Confirmed",
        contract_value: quotation.grand_total,
      });
      eventId = newEvent.id;

      // Link event back to quotation (stable quotationId → eventId relationship)
      await base44.asServiceRole.entities.Quotation.update(quotation.id, { event_id: eventId });
    } else {
      // Update existing event — reconcile, don't duplicate
      await base44.asServiceRole.entities.Event.update(eventId, {
        contract_value: quotation.grand_total,
        status: "Confirmed",
      });
    }

    // 2. Team sync — role items with team_member_id → EventTeamAssignment
    const roleItems = (quotationItems || []).filter(
      (i: any) => i.item_type === "role" && i.team_member_id
    );
    for (const item of roleItems) {
      const existing = await base44.asServiceRole.entities.EventTeamAssignment.filter({
        event_id: eventId,
        team_member_id: item.team_member_id,
        assignment_status: "Assigned",
      });
      const workingDates = item.day_date ? [item.day_date] : [];

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.EventTeamAssignment.update(existing[0].id, {
          role_id: item.reference_id || null,
          role_name_snapshot: item.name,
          agreed_rate: item.unit_rate || 0,
          working_dates: workingDates,
          category_type: item.member_side || "",
        });
      } else {
        await base44.asServiceRole.entities.EventTeamAssignment.create({
          workspace_id: quotation.workspace_id,
          event_id: eventId,
          team_member_id: item.team_member_id,
          role_id: item.reference_id || null,
          role_name_snapshot: item.name,
          agreed_rate: item.unit_rate || 0,
          rate_type: "Per Event",
          working_dates: workingDates,
          category_type: item.member_side || "",
          assignment_status: "Assigned",
        });
      }
    }

    // 3. Service sync — service items with reference_id → EventServiceAssignment
    const serviceItems = (quotationItems || []).filter(
      (i: any) => i.item_type === "service" && i.reference_id
    );
    const providerIds = [...new Set(serviceItems.map((i: any) => i.provider_id).filter(Boolean))];
    const providerNames: Record<string, string> = {};
    for (const pid of providerIds) {
      try {
        const member = await base44.asServiceRole.entities.TeamMember.get(pid);
        if (member) providerNames[pid] = member.name;
      } catch {}
    }

    for (const item of serviceItems) {
      const existing = await base44.asServiceRole.entities.EventServiceAssignment.filter({
        event_id: eventId,
        service_id: item.reference_id,
        assignment_status: "Assigned",
      });

      const providerName = item.provider_id ? providerNames[item.provider_id] || null : null;

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.EventServiceAssignment.update(existing[0].id, {
          provider_id: item.provider_id || null,
          provider_name_snapshot: providerName,
          rate: item.unit_rate || 0,
          is_addon: item.is_addon === true,
        });
      } else {
        await base44.asServiceRole.entities.EventServiceAssignment.create({
          workspace_id: quotation.workspace_id,
          event_id: eventId,
          service_id: item.reference_id,
          service_name_snapshot: item.name,
          provider_id: item.provider_id || null,
          provider_name_snapshot: providerName,
          rate: item.unit_rate || 0,
          is_addon: item.is_addon === true,
          assignment_status: "Assigned",
        });
      }
    }

    // 4. Milestone sync — create PaymentMilestone dues (not payments)
    // Duplicate prevention: only create if no milestones exist for this quotation
    const existingMilestones = await base44.asServiceRole.entities.PaymentMilestone.filter({
      quotation_id: quotation.id,
    });
    if (
      existingMilestones.length === 0 &&
      Array.isArray(quotation.milestones) &&
      quotation.milestones.length > 0
    ) {
      await base44.asServiceRole.entities.PaymentMilestone.bulkCreate(
        quotation.milestones.map((m: any, idx: number) => ({
          workspace_id: quotation.workspace_id,
          quotation_id: quotation.id,
          event_id: eventId,
          label: m.label || `Milestone ${idx + 1}`,
          percentage: m.percentage || 0,
          amount: m.amount || 0,
          paid_amount: 0,
          sort_order: idx,
          status: "upcoming",
        }))
      );
    }

    // 5. No FinancialTransaction created — acceptance ≠ payment
    // 6. SELF safety — no payable transactions created on acceptance

    return Response.json({ success: true, quotation_id: quotation.id, event_id: eventId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}