import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { amountInWords } from "../../shared/numberToWords.ts";

// Generates a workspace-specific invoice number: INV-YYYY-XXXX
// Queries the highest existing sequence for the current year and increments.
async function generateInvoiceNumber(base44: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const invoices = await base44.asServiceRole.entities.Invoice.filter(
    { workspace_id: workspaceId },
    "-invoice_number",
    500
  );
  let maxSeq = 0;
  for (const inv of invoices || []) {
    if (inv.invoice_number && inv.invoice_number.startsWith(prefix)) {
      const seq = parseInt(inv.invoice_number.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

function generateToken(): string {
  return ((crypto as any).randomUUID?.() || "") + ((crypto as any).randomUUID?.() || "");
}

function calculateTotals(
  lineItems: any[],
  discountType: string,
  discountValue: number,
  taxEnabled: boolean,
  taxRate: number,
  taxMode: string
) {
  const subtotal = (lineItems || []).reduce((s: number, item: any) => s + (item.line_total || 0), 0);
  const discountAmount =
    discountType === "percentage"
      ? Math.round((subtotal * (discountValue || 0)) / 100)
      : Math.min(discountValue || 0, subtotal);
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  let cgst = 0, sgst = 0, igst = 0, taxAmount = 0;
  if (taxEnabled && taxRate > 0) {
    taxAmount = Math.round((taxableAmount * taxRate) / 100);
    if (taxMode === "CGST_SGST") {
      cgst = Math.round(taxAmount / 2);
      sgst = taxAmount - cgst;
    } else {
      igst = taxAmount;
    }
  }
  const totalAmount = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxableAmount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, tax_amount: taxAmount, total_amount: totalAmount };
}

function computeDueDate(issueDate: string, dueDateType: string, customDueDate?: string): string {
  if (!issueDate) return "";
  if (dueDateType === "custom" && customDueDate) return customDueDate;
  if (dueDateType === "due_on_receipt") return issueDate;
  const d = new Date(issueDate + "T00:00:00");
  if (dueDateType === "net_15") d.setDate(d.getDate() + 15);
  else if (dueDateType === "net_30") d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// Create invoice — handles manual, full-from-quotation, and milestone-from-quotation.
// Server-side invoice number generation, snapshot creation, duplicate milestone prevention.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

    const workspaceId = body?.workspace_id;
    if (!workspaceId) return Response.json({ error: "workspace_id is required" }, { status: 400 });

    // Verify workspace access
    const workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId);
    if (!workspace) return Response.json({ error: "Workspace not found" }, { status: 404 });
    const isMember = workspace.owner_user_id === user.id || (workspace.member_user_ids || []).includes(user.id) || user.role === "admin";
    if (!isMember) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const invoiceType = body?.invoice_type || "manual";
    const quotationId = body?.quotation_id;
    const clientId = body?.client_id;
    if (!clientId) return Response.json({ error: "client_id is required" }, { status: 400 });

    let lineItems: any[] = body?.line_items || [];
    let milestoneIndex: number | null = body?.milestone_index ?? null;
    let milestoneTag: string | null = body?.milestone_tag || null;
    let eventId: string | null = body?.event_id || null;
    let discountType = body?.discount_type || "percentage";
    let discountValue = body?.discount_value || 0;
    let taxEnabled = body?.tax_enabled || false;
    let taxRate = body?.tax_rate || 0;
    let taxMode = body?.tax_mode || "CGST_SGST";

    // ─── Quotation conversion ───
    if (quotationId) {
      const quotation = await base44.asServiceRole.entities.Quotation.get(quotationId);
      if (!quotation) return Response.json({ error: "Quotation not found" }, { status: 404 });
      if (quotation.workspace_id !== workspaceId) return Response.json({ error: "Unauthorized" }, { status: 403 });
      if (quotation.status !== "Accepted" && quotation.status !== "Finalized") {
        return Response.json({ error: "Quotation must be Accepted or Finalized to create an invoice" }, { status: 400 });
      }

      eventId = eventId || quotation.event_id;

      if (invoiceType === "milestone" && milestoneIndex != null) {
        // ─── Duplicate milestone prevention ───
        const existing = await base44.asServiceRole.entities.Invoice.filter({
          workspace_id: workspaceId,
          quotation_id: quotationId,
          milestone_index: milestoneIndex,
        });
        const activeExisting = (existing || []).filter((e: any) => e.status !== "Cancelled");
        if (activeExisting.length > 0) {
          return Response.json(
            { error: "A milestone invoice already exists for this milestone", existing_invoice_id: activeExisting[0].id },
            { status: 409 }
          );
        }

        const milestones = quotation.milestones || [];
        const milestone = milestones[milestoneIndex];
        if (!milestone) return Response.json({ error: "Milestone not found in quotation" }, { status: 400 });

        const milestoneAmount = Math.round(milestone.amount || 0);
        milestoneTag = milestoneTag || milestone.label || "Custom";
        lineItems = [{
          description: `${milestone.label || "Milestone"} (${milestone.percentage || 0}%)`,
          deliverables: "",
          quantity: 1,
          unit_rate: milestoneAmount,
          line_total: milestoneAmount,
        }];
      } else if (invoiceType === "full") {
        // ─── Full invoice: import quotation items ───
        const quotItems = await base44.asServiceRole.entities.QuotationItem.filter(
          { quotation_id: quotationId },
          "sort_order",
          500
        );
        lineItems = (quotItems || []).map((item: any) => ({
          description: item.name || "",
          deliverables: item.description || "",
          quantity: item.quantity || 1,
          unit_rate: item.line_total ? Math.round(item.line_total / (item.quantity || 1)) : (item.unit_rate || 0),
          line_total: item.line_total || 0,
        }));
        discountType = quotation.discount_type || "percentage";
        discountValue = quotation.discount_value || 0;
        taxEnabled = quotation.gst_applicable || false;
        taxRate = workspace.default_gst_rate || 18;
        taxMode = (quotation.gst_mode || "cgst_sgst").toUpperCase() === "IGST" ? "IGST" : "CGST_SGST";
      }
    }

    // ─── Fetch client for snapshot ───
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    // ─── Fetch event for snapshot ───
    let event: any = null;
    if (eventId) {
      try { event = await base44.asServiceRole.entities.Event.get(eventId); } catch {}
    }

    // ─── Build snapshots ───
    const clientSnapshot = {
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: [client.address, client.city, client.state].filter(Boolean).join(", "),
      gstin: (client as any).gstin || "",
    };

    const businessSnapshot = {
      name: workspace.name,
      logo: workspace.logo || "",
      address: [workspace.address, workspace.city, workspace.state].filter(Boolean).join(", "),
      phone: workspace.phone || "",
      email: workspace.email || "",
      gstin: workspace.gstin || "",
      gst_business_name: workspace.gst_business_name || "",
      gst_billing_address: workspace.gst_billing_address || "",
      gst_state: workspace.gst_state || "",
    };

    const eventSnapshot = event ? {
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      venue: event.venue || "",
      venue_address: event.venue_address || "",
      event_type: event.event_type || "",
    } : {};

    const bankSnapshot = {
      bank_account_name: workspace.bank_account_name || "",
      bank_name: workspace.bank_name || "",
      bank_account_number: workspace.bank_account_number || "",
      bank_ifsc: workspace.bank_ifsc || "",
      bank_upi_id: workspace.bank_upi_id || "",
    };

    // ─── Calculate totals ───
    const totals = calculateTotals(lineItems, discountType, discountValue, taxEnabled, taxRate, taxMode);

    const issueDate = body?.issue_date || new Date().toISOString().slice(0, 10);
    const dueDate = computeDueDate(issueDate, body?.due_date_type || "due_on_receipt", body?.due_date);

    // ─── Generate invoice number ───
    const invoiceNumber = await generateInvoiceNumber(base44, workspaceId);
    const publicToken = generateToken().replace(/-/g, "");

    // ─── Create invoice ───
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      workspace_id: workspaceId,
      invoice_number: invoiceNumber,
      quotation_id: quotationId || null,
      client_id: clientId,
      event_id: eventId,
      issue_date: issueDate,
      due_date: dueDate,
      due_date_type: body?.due_date_type || "due_on_receipt",
      invoice_type: invoiceType,
      milestone_index: milestoneIndex,
      milestone_tag: milestoneTag,
      status: body?.status || "Draft",
      show_itemized_rates: body?.show_itemized_rates !== false,
      line_items: lineItems,
      discount_type: discountType,
      discount_value: discountValue,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      taxable_amount: totals.taxableAmount,
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      tax_mode: taxMode,
      cgst_amount: totals.cgst_amount,
      sgst_amount: totals.sgst_amount,
      igst_amount: totals.igst_amount,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
      amount_paid: 0,
      balance_due: totals.total_amount,
      amount_in_words: amountInWords(totals.total_amount, workspace.currency || "INR"),
      notes: body?.notes || "",
      payment_terms: body?.payment_terms || "",
      client_snapshot: clientSnapshot,
      business_snapshot: businessSnapshot,
      event_snapshot: eventSnapshot,
      bank_snapshot: bankSnapshot,
      public_access_enabled: false,
      public_token: publicToken,
      view_count: 0,
    });

    return Response.json({ invoice }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}