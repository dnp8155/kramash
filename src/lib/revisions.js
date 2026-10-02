// Revisions for quotations and invoices. A revision is a new draft copy numbered "<base>-R<n>"
// (Q-001 -> Q-001-R2). The client's public link moves to the newest revision once it is
// finalized / issued, and the older revisions are cancelled, so a link already shared keeps working.

import { base44 } from "@/api/base44Client";
import { createQuotation, loadQuotations } from "@/lib/quotationService";
import { createInvoice, loadInvoices } from "@/lib/invoiceService";

const REV_RE = /-R(\d+)$/i;

export const revisionBase = (num) => String(num || "").replace(REV_RE, "");
export const revisionNumber = (num) => {
  const m = String(num || "").match(REV_RE);
  return m ? Number(m[1]) : 1;
};

const familyOf = (list, key, number) => list.filter((r) => revisionBase(r[key]) === revisionBase(number));

// The newer revision that replaced `record`, or null when it is the latest.
export function newerRevision(list, key, record) {
  if (!record) return null;
  const n = revisionNumber(record[key]);
  return familyOf(list, key, record[key])
    .filter((r) => r.id !== record.id && revisionNumber(r[key]) > n)
    .sort((a, b) => revisionNumber(b[key]) - revisionNumber(a[key]))[0] || null;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nextNumber = (list, key, number) =>
  `${revisionBase(number)}-R${Math.max(...familyOf(list, key, number).map((r) => revisionNumber(r[key])), 1) + 1}`;

// Cancel older revisions and hand their public link to `latest`.
async function supersede(Entity, list, key, latest) {
  const older = familyOf(list, key, latest[key])
    .filter((r) => r.id !== latest.id && revisionNumber(r[key]) < revisionNumber(latest[key]) && r.status !== "cancelled");
  let link = null;
  for (const r of older) {
    if (r.public_token && !link) link = { public_token: r.public_token, public_link_enabled: !!r.public_link_enabled };
    await Entity.update(r.id, { status: "cancelled", public_token: "", public_link_enabled: false });
  }
  if (link) await Entity.update(latest.id, link);
  return { superseded: older, link };
}

// ---- Quotation ----

export async function reviseQuotation(workspaceId, source, items) {
  const all = await loadQuotations(workspaceId);
  if (newerRevision(all, "quotation_number", source)) throw new Error("A newer revision of this quotation already exists.");
  const validUntil = source.valid_until && source.valid_until > today() ? source.valid_until : null;
  const data = {
    ...source,
    quotation_number: nextNumber(all, "quotation_number", source.quotation_number),
    quotation_date: today(),
    valid_until: validUntil,
    status: "draft",
    public_token: ""
  };
  return createQuotation(workspaceId, data, items, {
    client_snapshot: source.client_snapshot || "",
    business_snapshot: source.business_snapshot || "",
    event_snapshot: source.event_snapshot || "",
    bank_details_snapshot: source.bank_details_snapshot || "",
    social_links_snapshot: source.social_links_snapshot || ""
  });
}

export async function supersedeQuotationRevisions(workspaceId, latest) {
  if (revisionNumber(latest.quotation_number) < 2) return { superseded: [], link: null };
  const all = await loadQuotations(workspaceId);
  return supersede(base44.entities.Quotation, all, "quotation_number", latest);
}

// ---- Invoice ----

export const canReviseInvoice = (inv) =>
  !!inv && inv.status !== "draft" && inv.status !== "cancelled" && inv.status !== "paid" && !(Number(inv.amount_paid) > 0);

export async function reviseInvoice(workspaceId, source, items) {
  if (Number(source.amount_paid) > 0) throw new Error("Payments are recorded on this invoice, so it can't be revised.");
  const all = await loadInvoices(workspaceId);
  if (newerRevision(all, "invoice_number", source)) throw new Error("A newer revision of this invoice already exists.");
  const data = {
    ...source,
    invoice_number: nextNumber(all, "invoice_number", source.invoice_number),
    invoice_date: today(),
    status: "draft"
  };
  return createInvoice(workspaceId, data, items, {
    client_snapshot: source.client_snapshot || "",
    business_snapshot: source.business_snapshot || "",
    event_snapshot: source.event_snapshot || "",
    bank_details_snapshot: source.bank_details_snapshot || "",
    social_links_snapshot: source.social_links_snapshot || ""
  });
}

export async function supersedeInvoiceRevisions(workspaceId, latest) {
  if (revisionNumber(latest.invoice_number) < 2) return { superseded: [], link: null };
  const all = await loadInvoices(workspaceId);
  return supersede(base44.entities.Invoice, all, "invoice_number", latest);
}
