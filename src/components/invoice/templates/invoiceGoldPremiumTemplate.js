import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { invoiceLineTotal } from "@/lib/invoiceService";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function money(n, symbol) {
  const v = Number(n) || 0;
  return symbol + " " + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function textToBulletList(text) {
  if (!text) return "";
  const lines = String(text).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

function parseEvents(json) {
  if (!json) return [];
  try { return JSON.parse(json) || []; } catch { return []; }
}

export function renderInvoiceGoldPremium(data) {
  const { workspace, invoice, items, currency, totals } = data;
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "\u20B9";

  // Business snapshot
  const bizSnap = (() => {
    if (!invoice?.business_snapshot) return null;
    try { return JSON.parse(invoice.business_snapshot); } catch { return null; }
  })();
  const biz = bizSnap || {
    name: workspace?.name || "Business Name",
    logo: workspace?.logo || "",
    address: workspace?.address || "",
    city: workspace?.city || "",
    state: workspace?.state || "",
    country: workspace?.country || "",
    phone: workspace?.phone || "",
    email: workspace?.email || "",
    business_type: workspace?.business_type || ""
  };

  // Client snapshot
  const cli = (() => {
    if (!invoice?.client_snapshot) return null;
    try { return JSON.parse(invoice.client_snapshot); } catch { return null; }
  })() || {};

  // Brand name split — last word gets gold accent
  const bizName = biz.name || "Business Name";
  const nameParts = bizName.trim().split(/\s+/);
  const brandPart1 = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : bizName;
  const brandPart2 = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const brandSub = (biz.business_type || "").toUpperCase();

  const addressLine = [biz.address, biz.city, biz.state, biz.country].filter(Boolean).join(", ");
  const phone = biz.phone || "";
  const email = biz.email || "";

  const logoUrl = biz.logo || "";
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />`
    : `<div style="width:100%;height:100%;display:grid;place-items:center;color:#d99a00;font-size:11px;font-weight:700;letter-spacing:1px;">LOGO</div>`;

  // Invoice meta
  const invoiceNumber = invoice?.invoice_number || "";
  const invoiceDate = fmtDate(invoice?.invoice_date);
  const dueDate = fmtDate(invoice?.due_date);

  // Client
  const clientName = cli.name || "Client Name";
  const clientAddressLines = [
    cli.address,
    [cli.city, cli.state].filter(Boolean).join(", "),
    cli.country
  ].filter(Boolean);
  const clientEmail = cli.email || "";
  const clientPhone = cli.phone || "";

  // Items — packages and line items
  const packages = (items || []).filter((it) => it.item_type === "package");
  const lineItems = (items || []).filter((it) => it.item_type !== "package");

  // Totals
  const subtotal = totals?.subtotal || invoice?.subtotal || 0;
  const discountAmount = totals?.discountAmount || invoice?.discount_amount || 0;
  const discountType = invoice?.discount_type || "percent";
  const discountValue = invoice?.discount_value || 0;
  const gstApplicable = !!invoice?.gst_applicable;
  const gstTotal = gstApplicable ? (totals?.gstTotal || invoice?.gst_total || 0) : 0;
  const grandTotal = totals?.grandTotal || invoice?.grand_total || 0;
  const gstRate = workspace?.default_gst_rate || 18;

  const notesHtml = textToBulletList(invoice?.notes);
  const termsHtml = textToBulletList(invoice?.terms_and_conditions);

  // Build package sections
  const packageSections = packages.map((pkg, idx) => {
    const events = parseEvents(pkg.events_json);
    const eventRows = events.map((ev, i) => `
      <tr>
        <td class="col-num">${String(i + 1).padStart(2, "0")}</td>
        <td class="col-desc">${escapeHtml(ev.event || ev.name || "")}</td>
        <td class="col-deliverables">${escapeHtml(ev.date ? fmtDate(ev.date) : "")}</td>
        <td class="col-duration">${escapeHtml(ev.location || "")}</td>
        <td class="col-amount">${escapeHtml(ev.slot || "")}</td>
      </tr>`).join("");

    return `
      <div class="package-block">
        <div class="package-header">
          <span class="package-title">${escapeHtml(pkg.name || "")}</span>
          <span class="package-amount">${money(pkg.line_total || invoiceLineTotal(pkg), symbol)}</span>
        </div>
        ${events.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>EVENT</th>
              <th>DATE</th>
              <th>LOCATION</th>
              <th>SLOT</th>
            </tr>
          </thead>
          <tbody>
${eventRows}
          </tbody>
        </table>` : ""}
        ${pkg.description ? `<div class="package-desc">${escapeHtml(pkg.description)}</div>` : ""}
      </div>`;
  }).join("");

  // Build line items table
  const lineItemRows = lineItems.map((it, i) => `
      <tr>
        <td class="col-num">${String(i + 1).padStart(2, "0")}</td>
        <td class="col-desc">${escapeHtml(it.name || "")}</td>
        <td class="col-deliverables"><div class="deliverables-editor">${escapeHtml(it.description || "")}</div></td>
        <td class="col-duration">${Number(it.quantity) || 1}</td>
        <td class="col-amount">${money(invoiceLineTotal(it), symbol)}</td>
      </tr>`).join("");

  const discountLabel = discountType === "percent" ? `DISCOUNT (${discountValue}%)` : "DISCOUNT";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #161616; }
    :root {
      --gold: #d99a00; --gold-dark: #b97d00; --black: #151515;
      --soft: #f7f7f7; --border: #dddddd; --muted: #666; --danger: #c0392b;
    }
    .invoice {
      width: 1120px; max-width: 100%; margin: auto; background: #ffffff; padding: 42px 42px 0;
    }
    .top-section { display: grid; grid-template-columns: 1.25fr 1fr 1.1fr; gap: 30px; align-items: start; }
    .brand-area { min-width: 0; }
    .brand-row { display: flex; align-items: center; gap: 16px; }
    .logo-box { width: 72px; height: 72px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .brand-name { font-size: 30px; line-height: 1; font-weight: 800; letter-spacing: -1px; }
    .brand-name .gold-text { color: var(--gold); }
    .brand-sub { margin-top: 7px; letter-spacing: 7px; font-size: 17px; }
    .tagline { margin-top: 25px; font-size: 14px; color: #333; }
    .tagline-line { width: 60px; height: 2px; background: var(--gold); margin-top: 10px; }
    .company-details { padding-top: 10px; }
    .detail-row { display: flex; gap: 12px; margin-bottom: 15px; align-items: flex-start; font-size: 14px; line-height: 1.45; }
    .detail-icon { width: 20px; font-size: 17px; text-align: center; flex-shrink: 0; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 52px; font-weight: 850; letter-spacing: -2px; }
    .invoice-id { color: var(--gold); font-size: 24px; font-weight: 700; margin-top: 6px; }
    .invoice-meta { margin-top: 25px; display: grid; grid-template-columns: auto 10px 1fr; justify-content: end; gap: 10px 12px; font-size: 14px; text-align: left; }
    .invoice-meta .label { font-weight: 700; }
    .separator { height: 2px; background: var(--gold); margin: 30px 0 28px; }
    .client-project { display: grid; grid-template-columns: 1fr 1.4fr; gap: 35px; align-items: end; }
    .to-label { color: var(--gold); font-size: 15px; font-weight: 800; margin-bottom: 7px; }
    .client-name { font-size: 24px; font-weight: 750; margin-bottom: 4px; }
    .client-line { font-size: 15px; line-height: 1.52; }
    .package-block { margin-top: 28px; }
    .package-header { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 2px solid var(--gold); margin-bottom: 14px; }
    .package-title { font-size: 20px; font-weight: 800; color: var(--black); }
    .package-amount { font-size: 20px; font-weight: 800; color: var(--gold); }
    .package-desc { margin-top: 10px; font-size: 14px; color: var(--muted); line-height: 1.5; }
    .table-wrap { margin-top: 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
    thead th { background: var(--black); color: var(--gold); padding: 13px 12px; text-align: center; font-weight: 800; border-right: 1px solid #555; }
    thead th:first-child { border-radius: 10px 0 0 0; }
    thead th:last-child { border-radius: 0 10px 0 0; border-right: 0; }
    tbody td { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 14px 14px; vertical-align: middle; line-height: 1.5; }
    tbody td:first-child { border-left: 1px solid var(--border); text-align: center; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .col-num { width: 50px; text-align: center; }
    .col-desc { width: 28%; font-weight: 700; }
    .col-deliverables { width: 35%; }
    .col-duration { width: 15%; text-align: center; }
    .col-amount { width: 16%; text-align: center; white-space: nowrap; font-weight: 600; }
    .deliverables-editor { white-space: pre-line; }
    .section-heading { margin-top: 36px; font-size: 18px; font-weight: 800; color: var(--black); padding-bottom: 10px; border-bottom: 2px solid var(--gold); margin-bottom: 14px; }
    .bottom-section { display: grid; grid-template-columns: 1.35fr 0.9fr; gap: 32px; margin-top: 30px; }
    .info-block { margin-bottom: 26px; }
    .info-heading { display: flex; align-items: center; gap: 12px; color: var(--gold); font-weight: 800; margin-bottom: 13px; font-size: 16px; }
    .round-icon { width: 36px; height: 36px; background: var(--gold); border-radius: 50%; color: white; display: grid; place-items: center; flex-shrink: 0; }
    .editable-list { padding-left: 52px; }
    .editable-list ul { padding-left: 17px; }
    .editable-list li { margin-bottom: 5px; line-height: 1.45; font-size: 13px; }
    .total-card { border: 1px solid var(--border); border-radius: 9px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 15px; }
    .total-row span:first-child { font-weight: 700; }
    .total-row:last-child { border-bottom: 0; }
    .discount-value { color: #d23434; }
    .grand-total { background: var(--gold); font-weight: 800; font-size: 17px; }
    .footer-top { margin-top: 35px; border-top: 1px solid #d5d5d5; display: grid; grid-template-columns: 180px 1fr 150px; gap: 25px; align-items: center; padding: 24px 8px; }
    .thank-you { color: var(--gold); font-size: 28px; font-family: Georgia, serif; font-style: italic; }
    .footer-msg { border-left: 1px solid #bbb; padding-left: 30px; font-size: 13px; line-height: 1.5; }
    @media (max-width: 900px) {
      .invoice { padding: 25px 20px 0; }
      .top-section { grid-template-columns: 1fr; }
      .invoice-title { text-align: left; }
      .invoice-meta { justify-content: start; }
      .client-project { grid-template-columns: 1fr; }
      .bottom-section { grid-template-columns: 1fr; }
      .footer-top { grid-template-columns: 1fr; }
      .footer-msg { border-left: 0; border-top: 1px solid #ccc; padding: 20px 0 0; }
    }
    @media print {
      @page { size: A4; margin: 0; }
      body { background: white; }
      .invoice { width: 210mm; max-width: 210mm; margin: 0; padding: 10mm 10mm 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice" id="invoice">

    <section class="top-section">
      <div class="brand-area">
        <div class="brand-row">
          <div class="logo-box">${logoHtml}</div>
          <div>
            <div class="brand-name">
              <span>${escapeHtml(brandPart1)}</span>${brandPart2 ? `<span class="gold-text">${escapeHtml(brandPart2)}</span>` : ""}
            </div>
            ${brandSub ? `<div class="brand-sub">${escapeHtml(brandSub)}</div>` : ""}
          </div>
        </div>
        <div class="tagline">Quality service you can trust.</div>
        <div class="tagline-line"></div>
      </div>

      <div class="company-details">
        ${addressLine ? `<div class="detail-row"><div class="detail-icon">&bull;</div><div>${escapeHtml(addressLine)}</div></div>` : ""}
        ${phone ? `<div class="detail-row"><div class="detail-icon">&#9742;</div><div>${escapeHtml(phone)}</div></div>` : ""}
        ${email ? `<div class="detail-row"><div class="detail-icon">&#9993;</div><div>${escapeHtml(email)}</div></div>` : ""}
      </div>

      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-id">${escapeHtml(invoiceNumber) || "#INV-000-0000"}</div>
        <div class="invoice-meta">
          <div class="label">Invoice Date</div><div>:</div><div>${escapeHtml(invoiceDate) || "&mdash;"}</div>
          ${dueDate ? `<div class="label">Due Date</div><div>:</div><div>${escapeHtml(dueDate)}</div>` : ""}
          <div class="label">Prepared By</div><div>:</div><div>${escapeHtml(bizName)}</div>
        </div>
      </div>
    </section>

    <div class="separator"></div>

    <section class="client-project">
      <div class="client-info">
        <div class="to-label">TO,</div>
        <div class="client-name">${escapeHtml(clientName)}</div>
        ${clientAddressLines.map((l) => `<div class="client-line">${escapeHtml(l)}</div>`).join("")}
        ${clientEmail ? `<div class="client-line" style="margin-top:8px;">&#9993; ${escapeHtml(clientEmail)}</div>` : ""}
        ${clientPhone ? `<div class="client-line">&#9742; ${escapeHtml(clientPhone)}</div>` : ""}
      </div>
    </section>

${packageSections}

${lineItems.length > 0 ? `
    <div class="section-heading">Add-ons &amp; Extras</div>
    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPTION</th>
            <th>DETAILS</th>
            <th>QTY</th>
            <th>AMOUNT (${escapeHtml(currency || "INR")})</th>
          </tr>
        </thead>
        <tbody>
${lineItemRows}
        </tbody>
      </table>
    </section>` : ""}

    <section class="bottom-section">
      <div>
        ${notesHtml ? `
        <div class="info-block">
          <div class="info-heading">
            <div class="round-icon">&#9635;</div>
            <span>NOTES</span>
          </div>
          <div class="editable-list">${notesHtml}</div>
        </div>` : ""}

        ${termsHtml ? `
        <div class="info-block">
          <div class="info-heading">
            <div class="round-icon">&#10003;</div>
            <span>TERMS &amp; CONDITIONS</span>
          </div>
          <div class="editable-list">${termsHtml}</div>
        </div>` : ""}
      </div>

      <div>
        <div class="total-card">
          <div class="total-row">
            <span>SUBTOTAL</span>
            <span>${money(subtotal, symbol)}</span>
          </div>
          ${discountAmount > 0 ? `
          <div class="total-row">
            <span>${discountLabel}</span>
            <span class="discount-value">- ${money(discountAmount, symbol)}</span>
          </div>` : ""}
          ${gstApplicable && gstTotal > 0 ? `
          <div class="total-row">
            <span>TAX (${gstRate}% GST)</span>
            <span>${money(gstTotal, symbol)}</span>
          </div>` : ""}
          <div class="total-row grand-total">
            <span>TOTAL AMOUNT</span>
            <span>${money(grandTotal, symbol)}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="footer-top">
      <div class="thank-you">Thank you!</div>
      <div class="footer-msg">We appreciate the opportunity to work with you.<br>Looking forward to building something great together.</div>
    </section>
  </div>
</body>
</html>`;
}