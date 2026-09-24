import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { invoiceLineTotal } from "@/lib/invoiceService";
import { quillContentCss } from "@/lib/quillContentStyles";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function safeRichHtml(text) {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function fmtDateLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function money(n, currency) {
  const v = Number(n) || 0;
  const sym = currency === "INR" ? "Rs" : (CURRENCY_SYMBOLS[currency] || currency || "");
  return sym + " " + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n) {
  if (n === 0) return "Zero";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  return "";
}

function amountInWords(amount) {
  let n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;
  if (crore) parts.push(numToWords(crore) + " Crore");
  if (lakh) parts.push(numToWords(lakh) + " Lakh");
  if (thousand) parts.push(numToWords(thousand) + " Thousand");
  if (hundred) parts.push(numToWords(hundred));
  return parts.join(" ");
}

function textToBullets(text) {
  if (!text) return "";
  const lines = String(text).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return lines.map((l) => `<div class="bullet-line">&bull; ${escapeHtml(l)}</div>`).join("");
}

function parsePrefs(workspace) {
  try { return workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {}; }
  catch { return {}; }
}

export function renderInvoiceSimpleBw(data) {
  const { workspace, invoice, items, currency, totals } = data;
  const prefs = parsePrefs(workspace);
  const showLogo = prefs.showLogoOnQuotation !== false;
  const showWatermark = prefs.showLogoWatermark !== false;

  const bizSnap = (() => {
    if (!invoice?.business_snapshot) return null;
    try { return JSON.parse(invoice.business_snapshot); } catch { return null; }
  })();
  const biz = bizSnap || {
    name: workspace?.name || "Business Name", logo: workspace?.logo || "",
    address: workspace?.address || "", city: workspace?.city || "", state: workspace?.state || "",
    country: workspace?.country || "", phone: workspace?.phone || "", email: workspace?.email || ""
  };

  const cli = (() => {
    if (!invoice?.client_snapshot) return null;
    try { return JSON.parse(invoice.client_snapshot); } catch { return null; }
  })() || {};

  const ev = (() => {
    if (!invoice?.event_snapshot) return null;
    try { return JSON.parse(invoice.event_snapshot); } catch { return null; }
  })() || {};
  const eventTitle = ev.title || "";
  const eventType = ev.event_type || "";
  const eventStart = ev.start_date ? fmtDateLong(ev.start_date) : "";
  const eventEnd = ev.end_date && ev.end_date !== ev.start_date ? fmtDateLong(ev.end_date) : "";
  const eventDateRange = eventStart ? (eventEnd ? `${eventStart} — ${eventEnd}` : eventStart) : "";

  const bizName = biz.name || "Business Name";
  const bizPhone = biz.phone || "";
  const bizEmail = biz.email || "";
  const bizAddress = [biz.address, biz.city, biz.state, biz.country].filter(Boolean).join(", ");
  const logoUrl = biz.logo || "";

  const invoiceNumber = invoice?.invoice_number || "";
  const invoiceDate = fmtDateLong(invoice?.invoice_date);
  const dueDate = fmtDateLong(invoice?.due_date);

  const clientName = cli.name || "Client Name";
  const clientAddress = cli.address || "";
  const clientCity = [cli.city, cli.state].filter(Boolean).join(", ");
  const clientPhone = cli.phone || "";
  const clientEmail = cli.email || "";

  const showItemizedRates = invoice?.show_itemized_rates !== false;
  const allItems = items || [];

  const subtotal = totals?.subtotal || invoice?.subtotal || 0;
  const discountAmount = totals?.discountAmount || invoice?.discount_amount || 0;
  const discountType = invoice?.discount_type || "percent";
  const discountValue = invoice?.discount_value || 0;
  const gstApplicable = !!invoice?.gst_applicable;
  const gstTotal = gstApplicable ? (totals?.gstTotal || invoice?.gst_total || 0) : 0;
  const gstRate = invoice?.gst_rate || workspace?.default_gst_rate || 18;
  const grandTotal = totals?.grandTotal || invoice?.grand_total || 0;
  const amountPaid = Number(invoice?.amount_paid) || 0;
  const balanceDue = Number(invoice?.balance_due) || (grandTotal - amountPaid);

  const totalWords = `(${currency === "INR" ? "INR " : ""}${amountInWords(grandTotal)})`;

  const notesHtml = textToBullets(invoice?.notes);
  const termsHtml = safeRichHtml(invoice?.terms_and_conditions || invoice?.payment_terms);

  const signatureType = invoice?.signature_type || "none";
  const signatureImage = invoice?.signature_image || "";
  const signatureColor = invoice?.signature_color || "#000000";
  const hasSignature = (signatureType === "text" || signatureType === "esign") && signatureImage;

  const itemRows = allItems.map((it, i) => {
    const lineTotal = invoiceLineTotal(it);
    if (showItemizedRates) {
      return `<tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-desc">${escapeHtml(it.name || "")}${it.description ? `<div class="item-desc">${escapeHtml(it.description)}</div>` : ""}</td>
        <td class="col-qty">${Number(it.quantity) || 1}</td>
        <td class="col-rate">${money(it.unit_rate || 0, currency)}</td>
        <td class="col-amount">${money(lineTotal, currency)}</td>
      </tr>`;
    }
    return `<tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-desc-full">${escapeHtml(it.name || "")}${it.description ? `<div class="item-desc">${escapeHtml(it.description)}</div>` : ""}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
    .invoice-page { width: 1000px; max-width: 100%; margin: auto; background: #fff; padding: 40px 46px; position: relative; overflow: hidden; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 380px; height: 380px; opacity: 0.05; z-index: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; }
    .watermark img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .content { position: relative; z-index: 1; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; gap: 20px; }
    .header-logo { width: 64px; height: 64px; flex-shrink: 0; }
    .header-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .header-brand { flex: 1; }
    .header-brand-name { font-size: 18px; font-weight: 800; }
    .header-contact { text-align: right; font-size: 13px; line-height: 1.6; color: #333; }
    .meta-row { display: flex; justify-content: space-between; margin-top: 18px; font-size: 13px; }
    .invoice-heading { text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 22px 0 24px; }
    .section-title { font-weight: 800; font-size: 14px; text-decoration: underline; margin-bottom: 10px; margin-top: 26px; }
    .detail-line { margin-bottom: 8px; font-size: 14px; }
    .detail-label { font-weight: 700; }
    .bullet-line { margin-bottom: 4px; font-size: 14px; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    .items-table th { border-bottom: 2px solid #1a1a1a; padding: 8px 10px; text-align: left; font-weight: 800; font-size: 12px; text-transform: uppercase; }
    .items-table td { border-bottom: 1px solid #ccc; padding: 8px 10px; vertical-align: top; }
    .col-num { width: 40px; text-align: center; }
    .col-desc { width: 40%; }
    .col-desc-full { width: auto; }
    .col-qty { width: 80px; text-align: center; }
    .col-rate { width: 120px; text-align: right; }
    .col-amount { width: 120px; text-align: right; }
    .item-desc { font-size: 12px; color: #666; margin-top: 2px; }
    .totals-box { margin-top: 16px; margin-left: auto; width: 320px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #ddd; }
    .total-row.grand { font-weight: 800; font-size: 16px; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; padding: 10px 0; margin-top: 4px; }
    .amount-words { font-style: italic; font-size: 13px; color: #444; margin-top: 8px; }
    .signed-block { margin-top: 30px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 12px; text-align: center; font-size: 12px; color: #666; }
    @media print {
      @page { size: A4; margin: 12mm; }
      .invoice-page { width: 100%; padding: 0; }
    }
    ${quillContentCss}
  </style>
</head>
<body>
  <div class="invoice-page">
    ${showWatermark && logoUrl ? `<div class="watermark"><img src="${escapeHtml(logoUrl)}" alt="" /></div>` : ""}
    <div class="content">
      <div class="header">
        ${showLogo && logoUrl ? `<div class="header-logo"><img src="${escapeHtml(logoUrl)}" alt="Logo" /></div>` : ""}
        <div class="header-brand"><div class="header-brand-name">${escapeHtml(bizName)}</div></div>
        <div class="header-contact">
          ${bizPhone ? `<div>Phone: ${escapeHtml(bizPhone)}</div>` : ""}
          ${bizEmail ? `<div>Email: ${escapeHtml(bizEmail)}</div>` : ""}
          ${bizAddress ? `<div>Address: ${escapeHtml(bizAddress)}</div>` : ""}
        </div>
      </div>
      <div class="meta-row">
        <div><strong>Invoice No:</strong> ${escapeHtml(invoiceNumber)}</div>
        <div><strong>Invoice Date:</strong> ${escapeHtml(invoiceDate)}</div>
        ${dueDate ? `<div><strong>Due Date:</strong> ${escapeHtml(dueDate)}</div>` : ""}
        ${eventDateRange ? `<div><strong>Project Date:</strong> ${escapeHtml(eventDateRange)}</div>` : ""}
      </div>
      <div class="invoice-heading">INVOICE</div>
      <div class="section-title">BILL TO</div>
      <div class="detail-line"><span class="detail-label">Name:</span> ${escapeHtml(clientName)}</div>
      ${clientAddress ? `<div class="detail-line"><span class="detail-label">Address:</span> ${escapeHtml(clientAddress)}</div>` : ""}
      ${clientCity ? `<div class="detail-line"><span class="detail-label">City:</span> ${escapeHtml(clientCity)}</div>` : ""}
      ${clientPhone ? `<div class="detail-line"><span class="detail-label">Contact Number:</span> ${escapeHtml(clientPhone)}</div>` : ""}
      ${clientEmail ? `<div class="detail-line"><span class="detail-label">Email:</span> ${escapeHtml(clientEmail)}</div>` : ""}
      ${eventTitle ? `<div class="detail-line"><span class="detail-label">Project:</span> ${escapeHtml(eventTitle)}</div>` : ""}
      ${eventType ? `<div class="detail-line"><span class="detail-label">Project Type:</span> ${escapeHtml(eventType)}</div>` : ""}
      ${eventDateRange ? `<div class="detail-line"><span class="detail-label">Project Date:</span> ${escapeHtml(eventDateRange)}</div>` : ""}
      <div class="section-title">ITEMS</div>
      <table class="items-table">
        <thead>
          ${showItemizedRates ? `<tr><th class="col-num">#</th><th class="col-desc">Description</th><th class="col-qty">Qty</th><th class="col-rate">Rate</th><th class="col-amount">Amount</th></tr>` : `<tr><th class="col-num">#</th><th class="col-desc-full">Description</th></tr>`}
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="${showItemizedRates ? 5 : 2}" style="text-align:center;color:#999;">No items</td></tr>`}
        </tbody>
      </table>
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${money(subtotal, currency)}</span></div>
        ${discountAmount > 0 ? `<div class="total-row"><span>Discount (${discountType === "percent" ? discountValue + "%" : "Fixed"})</span><span>- ${money(discountAmount, currency)}</span></div>` : ""}
        ${gstApplicable && gstTotal > 0 ? `<div class="total-row"><span>GST (${gstRate}%)</span><span>${money(gstTotal, currency)}</span></div>` : ""}
        <div class="total-row grand"><span>Total Amount</span><span>${money(grandTotal, currency)}</span></div>
        ${amountPaid > 0 ? `<div class="total-row"><span>Amount Paid</span><span>${money(amountPaid, currency)}</span></div>` : ""}
        ${balanceDue > 0 && amountPaid > 0 ? `<div class="total-row"><span>Balance Due</span><span>${money(balanceDue, currency)}</span></div>` : ""}
      </div>
      <div class="amount-words">${totalWords}</div>
      ${notesHtml ? `<div class="section-title">NOTES</div>${notesHtml}` : ""}
      ${termsHtml ? `<div class="section-title">TERMS &amp; CONDITIONS</div>${termsHtml}` : ""}
      <div class="signed-block">
        <div class="section-title">AUTHORIZED SIGNATURE</div>
        ${hasSignature
          ? `<div style="margin-top:8px;"><img src="${escapeHtml(signatureImage)}" alt="Signature" style="max-height:80px;max-width:300px;object-fit:contain;" /></div>
           <div class="detail-line" style="margin-top:8px;color:${escapeHtml(signatureColor)};">${escapeHtml(bizName)}</div>
           <div class="detail-line" style="font-size:12px;color:#666;">Signed on ${escapeHtml(invoiceDate)}</div>`
          : `<div class="detail-line">${escapeHtml(bizName)} on ${escapeHtml(invoiceDate)}</div>`}
      </div>
      <div class="footer">${escapeHtml(bizName)} &bull; Kramasha</div>
    </div>
  </div>
</body>
</html>`;
}