// Which invoice a client payment counts towards.
//
// A payment recorded on an event (or on a milestone) is not tied to an invoice, so the invoice kept saying "due" even
// though the client had paid in full. Here every payment that is not tied to an invoice is applied to the event's invoices,
// oldest first, up to what each one still owes. Payments tied to a milestone go to that milestone's invoice first.
// Payments entered on an invoice itself always count for that invoice only.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v) => Number(v) || 0;

// invoices:  one event's invoices { id, grand_total, status, milestone_id, invoice_date, created_at }
// receipts:  that event's ACTIVE CLIENT_RECEIPT transactions { invoice_id, milestone_id, amount }
// Returns [{ id, amount_paid }] for every issued invoice (drafts and cancelled invoices are never touched).
export function allocateEventReceipts(invoices = [], receipts = []) {
  const issued = invoices
    .filter((i) => i.status !== "draft" && i.status !== "cancelled")
    .sort((a, b) => String(a.invoice_date || "").localeCompare(String(b.invoice_date || "")) || String(a.created_at || a.created_date || "").localeCompare(String(b.created_at || b.created_date || "")));
  const invoiceIds = new Set(invoices.map((i) => i.id));

  // Payments tied to an invoice count for it directly (a tie to an invoice that no longer exists leaves them loose).
  const linked = {};
  const loose = [];
  for (const r of receipts) {
    if (r.invoice_id && invoiceIds.has(r.invoice_id)) linked[r.invoice_id] = round2((linked[r.invoice_id] || 0) + num(r.amount));
    else loose.push({ milestone_id: r.milestone_id || "", left: num(r.amount) });
  }
  const milestonesWithInvoice = new Set(issued.map((i) => i.milestone_id).filter(Boolean));

  const take = (pool, need) => {
    let got = 0;
    for (const p of pool) {
      if (need - got <= 0) break;
      const t = Math.min(p.left, need - got);
      p.left = round2(p.left - t);
      got = round2(got + t);
    }
    return got;
  };

  return issued.map((inv) => {
    const own = round2(linked[inv.id] || 0);
    let need = round2(Math.max(0, num(inv.grand_total) - own));
    let allocated = 0;
    // its own milestone's payments first
    if (inv.milestone_id) {
      const got = take(loose.filter((p) => p.milestone_id === inv.milestone_id), need);
      allocated = round2(allocated + got); need = round2(need - got);
    }
    // then payments on the event itself, and on milestones that have no invoice of their own
    const got = take(loose.filter((p) => !p.milestone_id || !milestonesWithInvoice.has(p.milestone_id)), need);
    allocated = round2(allocated + got);
    return { id: inv.id, amount_paid: round2(own + allocated) };
  });
}
