import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWorkspaceMembership } from '../../shared/planEngine.ts';
import {
  generateInvoiceNumber, computeInvoiceTotals, determineGstMode,
  amountToWords, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot,
  round2
} from '../../shared/invoiceHelpers.ts';

// Authenticated endpoint: creates an invoice from an accepted/finalized quotation.
// Supports two modes:
//   mode: "full"     — imports 100% of quotation items as a single full invoice
//   mode: "milestone" — creates an invoice for a specific milestone's due_amount
//
// Race-condition protection:
// - Server-side invoice number generation (INV-YYYY-XXXX, workspace-specific)
// - Duplicate prevention: checks if an invoice already exists for the same quotation + milestone
// - Financial snapshots are taken at creation time (immutable billing/business/event data)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, quotation_id, mode, milestone_id, due_date_type, due_date } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!quotation_id) return Response.json({ error: "quotation_id required" }, { status: 400 });
    if (!mode || !["full", "milestone"].includes(mode)) {
      return Response.json({ error: "mode must be 'full' or 'milestone'" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Load quotation (user-scoped — RLS ensures workspace isolation)
    const q = await base44.entities.Quotation.get(quotation_id);
    if (!q || q.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace." }, { status: 404 });
    }

    // Only accepted or finalized quotations can be invoiced
    if (!["accepted", "finalized"].includes(q.status)) {
      return Response.json({ error: "Quotation must be accepted or finalized to create an invoice." }, { status: 400 });
    }

    // Duplicate prevention — check if an invoice already exists for this quotation + milestone
    const existingInvoices = await base44.entities.Invoice.filter(
      { workspace_id, quotation_id, status: { $ne: "cancelled" } },
      "-invoice_date", 100
    );

    if (mode === "full") {
      // Full invoice — check if one already exists
      const existingFull = (existingInvoices || []).find(
        (inv) => inv.invoice_type === "full" && inv.status !== "cancelled"
      );
      if (existingFull) {
        return Response.json({ error: "DUPLICATE_INVOICE", message: "A full invoice already exists for this quotation.", invoice_id: existingFull.id }, { status: 409 });
      }
    } else if (mode === "milestone") {
      if (!milestone_id) return Response.json({ error: "milestone_id required for milestone mode" }, { status: 400 });
      // Milestone invoice — check if one already exists for this milestone
      const existingMilestone = (existingInvoices || []).find(
        (inv) => inv.milestone_id === milestone_id && inv.status !== "cancelled"
      );
      if (existingMilestone) {
        return Response.json({ error: "DUPLICATE_MILESTONE_INVOICE", message: "An invoice already exists for this milestone.", invoice_id: existingMilestone.id }, { status: 409 });
      }
    }

    // Load quotation items
    const quotationItems = await base44.entities.QuotationItem.filter(
      { quotation_id }, "sort_order", 500
    );

    // Load workspace for snapshots and GST config
    const workspace = await base44.entities.Workspace.get(workspace_id);
    if (!workspace) return Response.json({ error: "Workspace not found." }, { status: 404 });

    // Load client for snapshot
    let client = null;
    if (q.client_id) {
      try { client = await base44.entities.Client.get(q.client_id); } catch (e) { /* not found */ }
    }

    // Load event for snapshot
    let event = null;
    if (q.event_id) {
      try { event = await base44.entities.Event.get(q.event_id); } catch (e) { /* not found */ }
    }

    // Determine GST mode from business state vs client state
    const businessState = workspace.gst_state || workspace.state || "";
    const clientState = client?.state || "";
    const gstMode = determineGstMode(businessState, clientState);

    // Generate invoice number server-side
    const invoiceNumber = await generateInvoiceNumber(base44, workspace_id);

    // Calculate due date from type
    const today = new Date().toISOString().slice(0, 10);
    let calculatedDueDate = due_date || "";
    const ddt = due_date_type || "due_on_receipt";
    if (!calculatedDueDate) {
      if (ddt === "due_on_receipt") calculatedDueDate = today;
      else if (ddt === "net_15") {
        const d = new Date(); d.setDate(d.getDate() + 15);
        calculatedDueDate = d.toISOString().slice(0, 10);
      } else if (ddt === "net_30") {
        const d = new Date(); d.setDate(d.getDate() + 30);
        calculatedDueDate = d.toISOString().slice(0, 10);
      }
    }

    // Build invoice items from quotation items
    let invoiceItems = [];
    let milestoneTag = "Full Payment";
    let milestoneId = "";

    if (mode === "full") {
      // BUSINESS RULE: For Photography / Event Management, the client-facing
      // invoice must be PACKAGE / LUMP-SUM based. Internal team/role items
      // (manpower, internal rates) must NEVER appear as invoice line items.
      // Only the consolidated package + client-facing add-ons are billable.
      const isPackageCategory = ["PHOTOGRAPHY", "EVENT_MANAGEMENT"].includes(q.category);

      if (isPackageCategory) {
        const nonAddonItems = (quotationItems || []).filter((it) => !it.is_addon);
        const addonItems = (quotationItems || []).filter((it) => !!it.is_addon);

        // Package total = sum of all non-add-on line totals (the lump-sum price)
        const packageTotal = round2(nonAddonItems.reduce((s, it) => {
          const lt = Number(it.line_total) || (Number(it.quantity || 0) * Number(it.unit_rate || 0));
          return s + (lt || 0);
        }, 0));

        // Build included-scope deliverables from non-team, non-role items only
        const includedNames = nonAddonItems
          .filter((it) => !["team", "role"].includes(it.item_type))
          .map((it) => it.name)
          .filter(Boolean);
        const packageDeliverables = includedNames.join("\n");
        const packageDesc = q.project_summary || (includedNames.length > 0 ? includedNames.join("\n") : "");
        const packageName = q.project_title
          || (q.category === "PHOTOGRAPHY" ? "Photography Package" : "Event Package");

        invoiceItems = [];
        if (nonAddonItems.length > 0) {
          invoiceItems.push({
            item_type: "package",
            name: packageName,
            description: packageDesc,
            deliverables: packageDeliverables,
            quantity: 1,
            unit_rate: packageTotal
          });
        }
        // Add-ons are client-facing commercial items — shown separately
        for (const addon of addonItems) {
          invoiceItems.push({
            item_type: "line_item",
            name: `${addon.name || "Add-on"} (Add-on)`,
            description: addon.description || "",
            deliverables: addon.description || "",
            quantity: Math.max(1, Number(addon.quantity) || 1),
            unit_rate: round2(Math.max(0, Number(addon.unit_rate) || 0))
          });
        }
      } else {
        // Architecture / OTHER — itemized presentation is commercially appropriate
        invoiceItems = (quotationItems || []).map((it) => ({
          item_type: "line_item",
          name: it.name || "",
          description: it.description || "",
          deliverables: it.description || "",
          quantity: Math.max(1, Number(it.quantity) || 1),
          unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0))
        }));
      }
      milestoneTag = "Full Payment";
    } else if (mode === "milestone") {
      // Milestone invoice — single line item for the milestone amount
      const milestone = await base44.entities.PaymentMilestone.get(milestone_id);
      if (!milestone || milestone.workspace_id !== workspace_id) {
        return Response.json({ error: "Milestone not found in this workspace." }, { status: 404 });
      }
      if (milestone.quotation_id !== quotation_id) {
        return Response.json({ error: "Milestone does not belong to this quotation." }, { status: 400 });
      }

      const dueAmount = round2(Number(milestone.due_amount) || 0);
      if (dueAmount <= 0) {
        return Response.json({ error: "Milestone due amount must be greater than zero." }, { status: 400 });
      }

      // Check remaining invoiceable value (quotation total minus already-invoiced amounts)
      const alreadyInvoiced = round2((existingInvoices || [])
        .filter((inv) => inv.invoice_type === "milestone" && inv.status !== "cancelled")
        .reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0));
      const quotationTotal = round2(Number(q.grand_total) || 0);
      const remainingInvoiceable = round2(quotationTotal - alreadyInvoiced);

      if (dueAmount > remainingInvoiceable + 0.01) {
        return Response.json({
          error: "Milestone amount exceeds remaining invoiceable value.",
          remaining: remainingInvoiceable,
          milestone_amount: dueAmount
        }, { status: 400 });
      }

      // Create a single line item for the milestone
      invoiceItems = [{
        item_type: "line_item",
        name: `${milestone.name || "Milestone Payment"} — ${milestone.description || ""}`.trim(),
        description: milestone.description || milestone.due_condition || "",
        deliverables: "",
        quantity: 1,
        unit_rate: dueAmount
      }];

      milestoneTag = milestone.name || "Milestone";
      milestoneId = milestone_id;
    }

    // Calculate totals
    const gstApplicable = !!q.gst_applicable;
    const gstRate = Number(q.gst_applicable ? (workspace.default_gst_rate || 18) : 0);
    const totals = computeInvoiceTotals(invoiceItems, {
      discountType: mode === "full" ? (q.discount_type || "percent") : "percent",
      discountValue: mode === "full" ? (q.discount_value || 0) : 0,
      gstApplicable,
      gstRate,
      gstMode
    });

    const amountInWords = amountToWords(totals.grandTotal);

    // Create the invoice record
    const invoicePayload = {
      workspace_id,
      invoice_number: invoiceNumber,
      quotation_id: quotation_id,
      client_id: q.client_id || "",
      event_id: q.event_id || "",
      invoice_date: today,
      due_date: calculatedDueDate,
      due_date_type: ddt,
      invoice_type: mode,
      milestone_id: milestoneId,
      milestone_tag: milestoneTag,
      status: "draft",
      show_itemized_rates: q.show_pricing !== false,
      subtotal: totals.subtotal,
      discount_type: mode === "full" ? (q.discount_type || "percent") : "percent",
      discount_value: mode === "full" ? Math.max(0, Number(q.discount_value) || 0) : 0,
      discount_amount: totals.discountAmount,
      taxable_amount: totals.taxableAmount,
      gst_applicable: gstApplicable,
      gst_rate: gstRate,
      gst_mode: gstMode,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      gst_total: totals.gstTotal,
      grand_total: totals.grandTotal,
      amount_paid: 0,
      balance_due: totals.grandTotal,
      amount_in_words: amountInWords,
      payment_schedule_json: q.payment_schedule_json || "",
      client_snapshot: buildClientSnapshot(client) || q.client_snapshot || "",
      business_snapshot: buildBusinessSnapshot(workspace) || q.business_snapshot || "",
      event_snapshot: buildEventSnapshot(event) || q.event_snapshot || "",
      notes: "",
      payment_terms: q.terms_and_conditions || "",
      terms_and_conditions: q.terms_and_conditions || ""
    };

    const invoice = await base44.entities.Invoice.create(invoicePayload);

    // Create invoice items
    if (invoiceItems.length > 0) {
      const itemPayloads = invoiceItems.map((it, i) => ({
        workspace_id,
        invoice_id: invoice.id,
        item_type: it.item_type || "line_item",
        name: it.name || "",
        description: it.description || "",
        deliverables: it.deliverables || "",
        quantity: Math.max(0, Number(it.quantity) || 1),
        unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0)),
        line_total: round2(Math.max(0, Number(it.quantity) || 1) * Math.max(0, Number(it.unit_rate) || 0)),
        sort_order: i
      }));
      await base44.entities.InvoiceItem.bulkCreate(itemPayloads);
    }

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      grand_total: totals.grandTotal,
      amount_in_words: amountInWords
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}