import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

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

function deliverablesHtml(desc) {
  if (!desc) return "&mdash;";
  const lines = String(desc).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return escapeHtml(desc);
  return lines.map((l) => `&bull; ${escapeHtml(l)}`).join("<br>");
}

function durationText(it) {
  if (it.rate_type === "Per Day") return `${it.days || 1} Day(s)`;
  if (it.rate_type === "Per Unit") return `${it.quantity || 1} Unit(s)`;
  if (it.rate_type === "Per Event") return "Per Event";
  return "&mdash;";
}

function textToBulletList(text) {
  if (!text) return "";
  const lines = String(text).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

export function renderBlackPremium(data) {
  const { workspace, quotation, client, event, items, currency, templateConfig } = data;
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "\u20B9";
  const cfg = templateConfig || {};

  // Brand name split — last word gets black accent
  const bizName = workspace?.name || "Business Name";
  const nameParts = bizName.trim().split(/\s+/);
  const brandPart1 = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : bizName;
  const brandPart2 = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const brandSub = (workspace?.business_type || "").toUpperCase();

  const tagline = cfg.tagline || "Quality service you can trust.";
  const addressLine = [workspace?.address, workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", ");
  const phone = workspace?.phone || "";
  const email = workspace?.email || "";
  const website = cfg.website || "";

  const logoUrl = workspace?.logo || "";
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />`
    : `<div style="width:100%;height:100%;display:grid;place-items:center;color:#333;font-size:11px;font-weight:700;letter-spacing:1px;">LOGO</div>`;

  // Quotation meta
  const quoteNumber = quotation?.quotation_number || "";
  const quoteDate = fmtDate(quotation?.quotation_date);
  const validUntil = fmtDate(quotation?.valid_until);
  const preparedBy = workspace?.name || "";

  // Client
  const clientName = client?.name || "Client Name";
  const clientAddressLines = [
    client?.address,
    [client?.city, client?.state].filter(Boolean).join(", "),
    client?.country
  ].filter(Boolean);
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";

  // Project summary
  const projectSummary = cfg.project_summary || event?.title || "";

  // Items
  const itemRows = (items || []).map((it, i) => `
      <tr>
        <td class="col-num">${String(i + 1).padStart(2, "0")}</td>
        <td class="col-desc">${escapeHtml(it.name || "")}</td>
        <td class="col-deliverables">
          <div class="deliverables-editor">${deliverablesHtml(it.description)}</div>
        </td>
        <td class="col-duration">${durationText(it)}</td>
        <td class="col-amount">${money(it.line_total, symbol)}</td>
      </tr>`).join("") || `
      <tr>
        <td class="col-num">01</td>
        <td class="col-desc">No items</td>
        <td class="col-deliverables"><div class="deliverables-editor">&mdash;</div></td>
        <td class="col-duration">&mdash;</td>
        <td class="col-amount">${money(0, symbol)}</td>
      </tr>`;

  // Totals
  const subtotal = quotation?.subtotal || 0;
  const discountAmount = quotation?.discount_amount || 0;
  const gstApplicable = !!quotation?.gst_applicable;
  const gstTotal = gstApplicable ? (quotation?.gst_total || 0) : 0;
  const grandTotal = quotation?.grand_total || 0;
  const gstPercentage = gstApplicable && quotation?.taxable_amount
    ? Math.round((gstTotal / quotation.taxable_amount) * 100)
    : 0;

  // Notes & terms
  const notesHtml = textToBulletList(quotation?.notes);
  const termsHtml = textToBulletList(quotation?.terms_and_conditions);

  // Payment
  const paymentMethod = cfg.payment_method || "Bank Transfer / UPI / Cheque\nDetails will be shared upon confirmation.";
  const paymentHtml = paymentMethod.split("\n").map((l) => escapeHtml(l)).join("<br>");

  // Footer
  const thankYou = cfg.thank_you || "Thank you!";
  const footerMessage = cfg.footer_message || "We appreciate the opportunity to work with you.\nLooking forward to building something great together.";
  const footerHtml = footerMessage.split("\n").map((l) => escapeHtml(l)).join("<br>");
  const developerCredit = cfg.developer_credit || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quotation ${escapeHtml(quoteNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #161616; }
    :root {
      --accent: #1a1a1a; --accent-dark: #000000; --black: #151515;
      --soft: #f7f7f7; --border: #dddddd; --muted: #666; --danger: #c0392b;
    }
    .quotation {
      width: 1120px; max-width: 100%; margin: auto; background: #ffffff; padding: 30px 32px 0;
    }
    .top-section { display: grid; grid-template-columns: 1.25fr 1fr 1.1fr; gap: 24px; align-items: start; }
    .brand-area { min-width: 0; }
    .brand-row { display: flex; align-items: center; gap: 14px; }
    .logo-box { width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .brand-name { font-size: 26px; line-height: 1; font-weight: 800; letter-spacing: -1px; }
    .brand-name .accent-text { color: var(--accent); }
    .brand-sub { margin-top: 5px; letter-spacing: 6px; font-size: 15px; }
    .tagline { margin-top: 16px; font-size: 13px; color: #333; }
    .tagline-line { width: 50px; height: 2px; background: var(--accent); margin-top: 8px; }
    .company-details { padding-top: 6px; }
    .detail-row { display: flex; gap: 10px; margin-bottom: 9px; align-items: flex-start; font-size: 13px; line-height: 1.4; }
    .detail-icon { width: 18px; font-size: 15px; text-align: center; flex-shrink: 0; }
    .quote-title { text-align: right; }
    .quote-title h1 { font-size: 44px; font-weight: 850; letter-spacing: -2px; }
    .quote-id { color: var(--accent); font-size: 21px; font-weight: 700; margin-top: 4px; }
    .quote-meta { margin-top: 16px; display: grid; grid-template-columns: auto 8px 1fr; justify-content: end; gap: 7px 10px; font-size: 13px; text-align: left; }
    .quote-meta .label { font-weight: 700; }
    .separator { height: 2px; background: var(--accent); margin: 18px 0 16px; }
    .client-project { display: grid; grid-template-columns: 1fr 1.4fr; gap: 28px; align-items: end; }
    .to-label { color: var(--accent); font-size: 14px; font-weight: 800; margin-bottom: 5px; }
    .client-name { font-size: 21px; font-weight: 750; margin-bottom: 3px; }
    .client-line { font-size: 14px; line-height: 1.45; }
    .project-summary { border: 1px solid #ccc; border-radius: 11px; padding: 16px; display: grid; grid-template-columns: 48px 1fr; gap: 14px; align-items: center; background: linear-gradient(90deg, #fff, #f5f5f5); }
    .summary-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; font-size: 24px; color: #fff; }
    .summary-heading { color: var(--accent); font-weight: 800; font-size: 14px; margin-bottom: 6px; }
    .summary-text { font-size: 13px; line-height: 1.45; }
    .table-wrap { margin-top: 22px; overflow-x: auto; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
    thead th { background: var(--black); color: #fff; padding: 11px 10px; text-align: center; font-weight: 800; border-right: 1px solid #555; }
    thead th:first-child { border-radius: 9px 0 0 0; }
    thead th:last-child { border-radius: 0 9px 0 0; border-right: 0; }
    tbody td { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 11px 12px; vertical-align: middle; line-height: 1.4; }
    tbody td:first-child { border-left: 1px solid var(--border); text-align: center; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .col-num { width: 44px; text-align: center; }
    .col-desc { width: 23%; font-weight: 700; }
    .col-deliverables { width: 40%; }
    .col-duration { width: 15%; text-align: center; }
    .col-amount { width: 16%; text-align: center; white-space: nowrap; font-weight: 600; }
    .deliverables-editor { white-space: pre-line; }
    .bottom-section { display: grid; grid-template-columns: 1.35fr 0.9fr; gap: 28px; margin-top: 20px; }
    .info-block { margin-bottom: 16px; }
    .info-heading { display: flex; align-items: center; gap: 10px; color: var(--accent); font-weight: 800; margin-bottom: 9px; font-size: 14px; }
    .round-icon { width: 30px; height: 30px; background: var(--accent); border-radius: 50%; color: white; display: grid; place-items: center; flex-shrink: 0; font-size: 14px; }
    .editable-list { padding-left: 44px; }
    .editable-list ul { padding-left: 17px; }
    .editable-list li { margin-bottom: 3px; line-height: 1.4; font-size: 12px; }
    .total-card { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 14px; }
    .total-row span:first-child { font-weight: 700; }
    .total-row:last-child { border-bottom: 0; }
    .discount-value { color: #d23434; }
    .grand-total { background: var(--accent); color: #fff; font-weight: 800; font-size: 16px; }
    .payment-method { margin-top: 18px; padding-left: 2px; }
    .payment-head { display: flex; align-items: center; gap: 10px; color: var(--accent); font-size: 14px; font-weight: 800; }
    .payment-text { margin: 7px 0 0 42px; font-size: 13px; line-height: 1.45; }
    .footer-top { margin-top: 18px; border-top: 1px solid #d5d5d5; display: grid; grid-template-columns: 160px 1fr 140px; gap: 20px; align-items: center; padding: 14px 4px; }
    .thank-you { color: var(--accent); font-size: 24px; font-family: Georgia, serif; font-style: italic; }
    .footer-msg { border-left: 1px solid #bbb; padding-left: 22px; font-size: 12px; line-height: 1.45; }
    .social { text-align: right; }
    .social-title { font-size: 11px; margin-bottom: 6px; }
    .social-icons { display: flex; justify-content: flex-end; gap: 7px; }
    .social-circle { width: 22px; height: 22px; background: var(--black); color: white; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: bold; }
    .developer-footer { background: #151515; color: #fff; margin-left: -32px; margin-right: -32px; padding: 10px; text-align: center; font-size: 12px; }
    .developer-footer span { color: #aaa; }
    @media (max-width: 900px) {
      .quotation { padding: 20px 18px 0; }
      .top-section { grid-template-columns: 1fr; }
      .quote-title { text-align: left; }
      .quote-meta { justify-content: start; }
      .client-project { grid-template-columns: 1fr; }
      .bottom-section { grid-template-columns: 1fr; }
      .footer-top { grid-template-columns: 1fr; }
      .footer-msg { border-left: 0; border-top: 1px solid #ccc; padding: 14px 0 0; }
      .social { text-align: left; }
      .social-icons { justify-content: flex-start; }
      .developer-footer { margin-left: -18px; margin-right: -18px; }
    }
    @media print {
      @page { size: A4; margin: 0; }
      body { background: white; }
      .quotation { width: 210mm; max-width: 210mm; margin: 0; padding: 8mm 10mm 0; box-shadow: none; }
      .developer-footer { margin-left: -10mm; margin-right: -10mm; }
    }
  </style>
</head>
<body>
  <div class="quotation" id="quotation">

    <section class="top-section">
      <div class="brand-area">
        <div class="brand-row">
          <div class="logo-box">${logoHtml}</div>
          <div>
            <div class="brand-name">
              <span>${escapeHtml(brandPart1)}</span>${brandPart2 ? `<span class="accent-text">${escapeHtml(brandPart2)}</span>` : ""}
            </div>
            ${brandSub ? `<div class="brand-sub">${escapeHtml(brandSub)}</div>` : ""}
          </div>
        </div>
        <div class="tagline">${escapeHtml(tagline)}</div>
        <div class="tagline-line"></div>
      </div>

      <div class="company-details">
        ${addressLine ? `<div class="detail-row"><div class="detail-icon">&bull;</div><div>${escapeHtml(addressLine)}</div></div>` : ""}
        ${phone ? `<div class="detail-row"><div class="detail-icon">&#9742;</div><div>${escapeHtml(phone)}</div></div>` : ""}
        ${email ? `<div class="detail-row"><div class="detail-icon">&#9993;</div><div>${escapeHtml(email)}</div></div>` : ""}
        ${website ? `<div class="detail-row"><div class="detail-icon">&#9678;</div><div>${escapeHtml(website)}</div></div>` : ""}
      </div>

      <div class="quote-title">
        <h1>QUOTATION</h1>
        <div class="quote-id">${escapeHtml(quoteNumber) || "#QT-000-0000"}</div>
        <div class="quote-meta">
          <div class="label">Quotation Date</div><div>:</div><div>${escapeHtml(quoteDate) || "&mdash;"}</div>
          <div class="label">Valid Until</div><div>:</div><div>${escapeHtml(validUntil) || "&mdash;"}</div>
          <div class="label">Prepared By</div><div>:</div><div>${escapeHtml(preparedBy)}</div>
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
      ${projectSummary ? `
      <div class="project-summary">
        <div class="summary-icon">&#9635;</div>
        <div>
          <div class="summary-heading">PROJECT SUMMARY</div>
          <div class="summary-text">${escapeHtml(projectSummary)}</div>
        </div>
      </div>` : ""}
    </section>

    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPTION</th>
            <th>DELIVERABLES</th>
            <th>DURATION</th>
            <th>AMOUNT (${escapeHtml(currency || "INR")})</th>
          </tr>
        </thead>
        <tbody>
${itemRows}
        </tbody>
      </table>
    </section>

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
            <span>DISCOUNT</span>
            <span class="discount-value">- ${money(discountAmount, symbol)}</span>
          </div>` : ""}
          <div class="total-row">
            <span>TAX (${gstPercentage}% GST)</span>
            <span>${money(gstTotal, symbol)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL AMOUNT</span>
            <span>${money(grandTotal, symbol)}</span>
          </div>
        </div>

        <div class="payment-method">
          <div class="payment-head">
            <div class="round-icon">${escapeHtml(symbol)}</div>
            <span>PAYMENT METHOD</span>
          </div>
          <div class="payment-text">${paymentHtml}</div>
        </div>
      </div>
    </section>

    <section class="footer-top">
      <div class="thank-you">${escapeHtml(thankYou)}</div>
      <div class="footer-msg">${footerHtml}</div>
      <div class="social">
        <div class="social-title">Follow Us</div>
        <div class="social-icons">
          <div class="social-circle">f</div>
          <div class="social-circle">in</div>
          <div class="social-circle">ig</div>
          <div class="social-circle">&bull;</div>
        </div>
      </div>
    </section>

    ${developerCredit ? `
    <footer class="developer-footer">developed by <span>${escapeHtml(developerCredit)}</span></footer>` : ""}
  </div>
</body>
</html>`;
}