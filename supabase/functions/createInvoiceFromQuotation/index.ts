import { withCors } from "../_shared/cors.ts";
// createInvoiceFromQuotation — Create invoice from accepted quotation (full or milestone mode).
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import {
  generateInvoiceNumber, computeInvoiceTotals, determineGstMode,
  amountToWords, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot, round2
} from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, quotation_id, mode, milestone_id, due_date_type, due_date } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!quotation_id) return Response.json({ error: "quotation_id required" }, { status: 400 });
    if (!mode || !["full", "milestone"].includes(mode)) {
      return Response.json({ error: "mode must be 'full' or 'milestone'" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: q } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!q || q.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace." }, { status: 404 });
    }
    if (!["accepted", "finalized"].includes(q.status)) {
      return Response.json({ error: "Quotation must be accepted or finalized to create an invoice." }, { status: 400 });
    }

    const { data: existingInvoices } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("quotation_id", quotation_id)
      .neq("status", "cancelled")
      .order("invoice_date", { ascending: false })
      .limit(100);

    if (mode === "full") {
      const existingFull = (existingInvoices || []).find((inv) => inv.invoice_type === "full" && inv.status !== "cancelled");
      if (existingFull) {
        return Response.json({ error: "DUPLICATE_INVOICE", message: "A full invoice already exists for this quotation.", invoice_id: existingFull.id }, { status: 409 });
      }
    } else if (mode === "milestone") {
      if (!milestone_id) return Response.json({ error: "milestone_id required for milestone mode" }, { status: 400 });
      const existingMilestone = (existingInvoices || []).find((inv) => inv.milestone_id === milestone_id && inv.status !== "cancelled");
      if (existingMilestone) {
        return Response.json({ error: "DUPLICATE_MILESTONE_INVOICE", message: "An invoice already exists for this milestone.", invoice_id: existingMilestone.id }, { status: 409 });
      }
    }

    const { data: quotationItems } = await supabaseAdmin
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotation_id)
      .order("sort_order", { ascending: true })
      .limit(500);

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    if (!workspace) return Response.json({ error: "Workspace not found." }, { status: 404 });

    let client = null;
    if (q.client_id) {
      const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", q.client_id).single();
      client = c;
    }
    let event = null;
    if (q.event_id) {
      const { data: e } = await supabaseAdmin.from("events").select("*").eq("id", q.event_id).single();
      event = e;
    }

    const businessState = workspace.gst_state || workspace.state || "";
    const clientState = client?.state || "";
    const gstMode = determineGstMode(businessState, clientState);

    const invoiceNumber = await generateInvoiceNumber(supabaseAdmin, workspace_id);

    const today = new Date().toISOString().slice(0, 10);
    let calculatedDueDate = due_date || "";
    const ddt = due_date_type || "due_on_receipt";
    if (!calculatedDueDate) {
      if (ddt === "due_on_receipt") calculatedDueDate = today;
      else if (ddt === "net_15") { const d = new Date(); d.setDate(d.getDate() + 15); calculatedDueDate = d.toISOString().slice(0, 10); }
      else if (ddt === "net_30") { const d = new Date(); d.setDate(d.getDate() + 30); calculatedDueDate = d.toISOString().slice(0, 10); }
    }

    let invoiceItems: any[] = [];
    let milestoneTag = "Full Payment";
    let milestoneId = "";

    if (mode === "full") {
      const isPackageCategory = ["PHOTOGRAPHY", "EVENT_MANAGEMENT"].includes(q.category);
      if (isPackageCategory) {
        const nonAddonItems = (quotationItems || []).filter((it) => !it.is_addon);
        const addonItems = (quotationItems || []).filter((it) => !!it.is_addon);
        const packageTotal = round2(nonAddonItems.reduce((s, it) => {
          const lt = Number(it.line_total) || (Number(it.quantity || 0) * Number(it.unit_rate || 0));
          return s + (lt || 0);
        }, 0));
        const includedNames = nonAddonItems.filter((it) => !["team", "role"].includes(it.item_type)).map((it) => it.name).filter(Boolean);
        const packageDeliverables = includedNames.join("\n");
        const packageDesc = q.project_summary || (includedNames.length > 0 ? includedNames.join("\n") : "");
        const packageName = q.project_title || (q.category === "PHOTOGRAPHY" ? "Photography Package" : "Event Package");

        invoiceItems = [];
        if (nonAddonItems.length > 0) {
          invoiceItems.push({ item_type: "package", name: packageName, description: packageDesc, deliverables: packageDeliverables, quantity: 1, unit_rate: packageTotal });
        }
        for (const addon of addonItems) {
          invoiceItems.push({ item_type: "line_item", name: `${addon.name || "Add-on"} (Add-on)`, description: addon.description || "", deliverables: addon.description || "", quantity: Math.max(1, Number(addon.quantity) || 1), unit_rate: round2(Math.max(0, Number(addon.unit_rate) || 0)) });
        }
      } else {
        invoiceItems = (quotationItems || []).map((it) => ({
          item_type: "line_item", name: it.name || "", description: it.description || "", deliverables: it.description || "",
          quantity: Math.max(1, Number(it.quantity) || 1), unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0))
        }));
      }
    } else if (mode === "milestone") {
      const { data: milestone } = await supabaseAdmin.from("payment_milestones").select("*").eq("id", milestone_id).single();
      if (!milestone || milestone.workspace_id !== workspace_id) {
        return Response.json({ error: "Milestone not found in this workspace." }, { status: 404 });
      }
      if (milestone.quotation_id !== quotation_id) {
        return Response.json({ error: "Milestone does not belong to this quotation." }, { status: 400 });
      }
      const dueAmount = round2(Number(milestone.due_amount) || 0);
      if (dueAmount <= 0) return Response.json({ error: "Milestone due amount must be greater than zero." }, { status: 400 });

      const alreadyInvoiced = round2((existingInvoices || []).filter((inv) => inv.invoice_type === "milestone" && inv.status !== "cancelled").reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0));
      const quotationTotal = round2(Number(q.grand_total) || 0);
      const remainingInvoiceable = round2(quotationTotal - alreadyInvoiced);
      if (dueAmount > remainingInvoiceable + 0.01) {
        return Response.json({ error: "Milestone amount exceeds remaining invoiceable value.", remaining: remainingInvoiceable, milestone_amount: dueAmount }, { status: 400 });
      }

      invoiceItems = [{ item_type: "line_item", name: `${milestone.name || "Milestone Payment"} — ${milestone.description || ""}`.trim(), description: milestone.description || milestone.due_condition || "", deliverables: "", quantity: 1, unit_rate: dueAmount }];
      milestoneTag = milestone.name || "Milestone";
      milestoneId = milestone_id;
    }

    const gstApplicable = !!q.gst_applicable;
    let gstRate = 0;
    if (gstApplicable) {
      const taxable = Number(q.taxable_amount) || 0;
      const gstTotal = Number(q.gst_total) || 0;
      if (taxable > 0 && gstTotal > 0) gstRate = round2((gstTotal / taxable) * 100);
      else gstRate = Number(workspace.default_gst_rate) || 18;
    }
    const totals = computeInvoiceTotals(invoiceItems, {
      discountType: mode === "full" ? (q.discount_type || "percent") : "percent",
      discountValue: mode === "full" ? (q.discount_value || 0) : 0,
      gstApplicable, gstRate, gstMode
    });
    const amountInWordsStr = amountToWords(totals.grandTotal);

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        workspace_id, invoice_number: invoiceNumber, quotation_id,
        client_id: q.client_id || "", event_id: q.event_id || "",
        invoice_date: today, due_date: calculatedDueDate, due_date_type: ddt,
        invoice_type: mode, milestone_id: milestoneId, milestone_tag: milestoneTag,
        status: "draft", show_itemized_rates: q.show_pricing !== false,
        subtotal: totals.subtotal,
        discount_type: mode === "full" ? (q.discount_type || "percent") : "percent",
        discount_value: mode === "full" ? Math.max(0, Number(q.discount_value) || 0) : 0,
        discount_amount: totals.discountAmount, taxable_amount: totals.taxableAmount,
        gst_applicable: gstApplicable, gst_rate: gstRate, gst_mode: gstMode,
        cgst_amount: totals.cgstAmount, sgst_amount: totals.sgstAmount, igst_amount: totals.igstAmount,
        gst_total: totals.gstTotal, grand_total: totals.grandTotal,
        amount_paid: 0, balance_due: totals.grandTotal, amount_in_words: amountInWordsStr,
        payment_schedule_json: q.payment_schedule_json || "",
        client_snapshot: buildClientSnapshot(client) || q.client_snapshot || "",
        business_snapshot: buildBusinessSnapshot(workspace) || q.business_snapshot || "",
        event_snapshot: buildEventSnapshot(event) || q.event_snapshot || "",
        bank_details_snapshot: q.bank_details_snapshot || "",
        social_links_snapshot: q.social_links_snapshot || "",
        notes: "", payment_terms: q.payment_conditions || q.terms_and_conditions || "",
        terms_and_conditions: q.terms_and_conditions || ""
      })
      .select("*")
      .single();
    if (invErr) throw invErr;

    if (invoiceItems.length > 0) {
      const itemPayloads = invoiceItems.map((it, i) => ({
        workspace_id, invoice_id: invoice.id,
        item_type: it.item_type || "line_item", name: it.name || "", description: it.description || "",
        deliverables: it.deliverables || "", quantity: Math.max(0, Number(it.quantity) || 1),
        unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0)),
        line_total: round2(Math.max(0, Number(it.quantity) || 1) * Math.max(0, Number(it.unit_rate) || 0)),
        sort_order: i
      }));
      await supabaseAdmin.from("invoice_items").insert(itemPayloads);
    }

    return Response.json({ success: true, invoice_id: invoice.id, invoice_number: invoiceNumber, grand_total: totals.grandTotal, amount_in_words: amountInWordsStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));