import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";

// Public endpoint — no auth required. The public_token authorizes access
// to exactly one quotation. Service role is used because there is no
// authenticated user; the token itself is the authorization.
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

    // Admin preview mode — loads quotation data without incrementing the
    // client view counter. Used when the admin opens the public link from
    // the dashboard to preview the client experience.
    const isPreview = body?.preview === true;

    // Find portal by token
    const portals = await base44.asServiceRole.entities.QuotationPortal.filter({
      public_token: token,
    });
    if (!portals || portals.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const portal = portals[0];

    if (!portal.is_enabled) {
      return Response.json(
        { error: "disabled", message: "This project link is currently unavailable." },
        { status: 403 }
      );
    }

    // Get quotation
    const quotation = await base44.asServiceRole.entities.Quotation.get(portal.quotation_id);
    if (!quotation) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Get quotation items
    const items = await base44.asServiceRole.entities.QuotationItem.filter(
      { quotation_id: quotation.id },
      "sort_order",
      500
    );

    // Get workspace (limited public fields)
    const workspace = await base44.asServiceRole.entities.Workspace.get(quotation.workspace_id);

    // Get event if linked
    let event: any = null;
    if (quotation.event_id) {
      event = await base44.asServiceRole.entities.Event.get(quotation.event_id);
    }

    // Determine client display data
    const isFinalized = ["Finalized", "Accepted", "Rejected"].includes(quotation.status);
    let client: any = null;
    if (isFinalized && quotation.client_snapshot) {
      client = quotation.client_snapshot;
    } else if (quotation.custom_client) {
      client = quotation.custom_client;
    } else if (quotation.client_id) {
      const c = await base44.asServiceRole.entities.Client.get(quotation.client_id);
      if (c) client = { name: c.name, phone: c.phone, email: c.email, address: [c.address, c.city, c.state].filter(Boolean).join(", ") };
    }

    // Get team assignments for the event
    let teamAssignments: any[] = [];
    if (event) {
      const assignments = await base44.asServiceRole.entities.EventTeamAssignment.filter({
        event_id: event.id,
        assignment_status: "Assigned",
      });
      const memberIds = [...new Set(assignments.map((a: any) => a.team_member_id).filter(Boolean))];
      const members: any[] = [];
      for (const mid of memberIds) {
        try {
          const m = await base44.asServiceRole.entities.TeamMember.get(mid);
          if (m) members.push(m);
        } catch {}
      }
      teamAssignments = assignments.map((a: any) => {
        const member = members.find((m) => m.id === a.team_member_id);
        return {
          role_name: a.role_name_snapshot || "Team Member",
          member_name: member?.name || null,
        };
      });
    }

    // Get service assignments for the event
    let serviceAssignments: any[] = [];
    if (event) {
      const assignments = await base44.asServiceRole.entities.EventServiceAssignment.filter({
        event_id: event.id,
        assignment_status: "Assigned",
      });
      serviceAssignments = assignments.map((a: any) => ({
        service_name: a.service_name_snapshot || "Service",
        provider_name: a.provider_name_snapshot || null,
      }));
    }

    // Compute payment summary from actual transactions
    let paymentSummary = { total_payable: 0, total_paid: 0, balance: 0, has_payments: false };
    const totalPayable = Number(quotation.grand_total) || (event ? Number(event.contract_value) || 0 : 0);
    if (event) {
      const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter({
        event_id: event.id,
        transaction_type: "CLIENT_RECEIPT",
        status: "ACTIVE",
      });
      const totalPaid = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      paymentSummary = {
        total_payable: totalPayable,
        total_paid: totalPaid,
        balance: totalPayable - totalPaid,
        has_payments: totalPaid > 0,
      };
    } else {
      paymentSummary = { total_payable: totalPayable, total_paid: 0, balance: totalPayable, has_payments: false };
    }

    // Increment view count (post-response, non-blocking).
    // Skipped in preview mode so admin previews don't count as client views.
    if (!isPreview) {
      const now = new Date().toISOString();
      waitUntil(
        base44.asServiceRole.entities.QuotationPortal.update(portal.id, {
          view_count: (portal.view_count || 0) + 1,
          first_viewed_at: portal.first_viewed_at || now,
          last_viewed_at: now,
        })
      );
    }

    // Compute expiry
    const isExpired =
      quotation.valid_until &&
      new Date(quotation.valid_until) < new Date() &&
      quotation.status !== "Accepted";

    return Response.json({
      quotation: {
        id: quotation.id,
        quotation_number: quotation.quotation_number,
        status: quotation.status,
        category: quotation.category,
        context_side: quotation.context_side,
        property_type: quotation.property_type,
        project_start_date: quotation.project_start_date,
        project_end_date: quotation.project_end_date,
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until,
        subtotal: quotation.subtotal,
        discount_type: quotation.discount_type,
        discount_value: quotation.discount_value,
        discount_amount: quotation.discount_amount,
        taxable_amount: quotation.taxable_amount,
        gst_applicable: quotation.gst_applicable,
        gst_mode: quotation.gst_mode,
        cgst_amount: quotation.cgst_amount,
        sgst_amount: quotation.sgst_amount,
        igst_amount: quotation.igst_amount,
        gst_total: quotation.gst_total,
        grand_total: quotation.grand_total,
        terms_and_conditions: quotation.terms_and_conditions,
        special_notes: quotation.special_notes,
        show_item_pricing: quotation.show_item_pricing !== false,
        hide_team_names: quotation.hide_team_names === true,
        is_package: quotation.is_package === true,
        package_name: quotation.package_name || "",
        package_inclusions: quotation.package_inclusions || "",
        milestones: Array.isArray(quotation.milestones) ? quotation.milestones : [],
        signed_at: quotation.signed_at || null,
        signed_by_name: quotation.signed_by_name || "",
        signature_data: quotation.signature_data || "",
        signature_type: quotation.signature_type || "",
        client_snapshot: quotation.client_snapshot,
        business_snapshot: quotation.business_snapshot,
        event_snapshot: quotation.event_snapshot,
      },
      items: (items || []).map((i: any) => ({
        name: i.name,
        description: i.description,
        item_type: i.item_type,
        quantity: i.quantity,
        days: i.days,
        unit_rate: i.unit_rate,
        line_total: i.line_total,
        day_date: i.day_date,
        phase_title: i.phase_title,
        member_side: i.member_side,
      })),
      workspace: workspace
        ? {
            name: workspace.name,
            logo: workspace.logo,
            phone: workspace.phone,
            email: workspace.email,
            address: [workspace.address, workspace.city, workspace.state].filter(Boolean).join(", "),
            gstin: workspace.gstin || "",
            gst_business_name: workspace.gst_business_name || "",
            bank_account_name: workspace.bank_account_name || "",
            bank_name: workspace.bank_name || "",
            bank_account_number: workspace.bank_account_number || "",
            bank_ifsc: workspace.bank_ifsc || "",
            bank_upi_id: workspace.bank_upi_id || "",
            social_instagram: workspace.social_instagram || "",
            social_website: workspace.social_website || "",
            social_youtube: workspace.social_youtube || "",
          }
        : null,
      event: event
        ? {
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            venue: event.venue,
            venue_address: event.venue_address,
            status: event.status,
          }
        : null,
      client,
      team_assignments: teamAssignments,
      service_assignments: serviceAssignments,
      payment_summary: paymentSummary,
      is_expired: isExpired,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}