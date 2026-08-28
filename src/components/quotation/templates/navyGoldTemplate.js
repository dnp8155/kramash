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

function formatMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function durationText(it) {
  if (it.rate_type === "Per Day") return `${it.days || 1} Day(s)`;
  if (it.rate_type === "Per Unit") return `${it.quantity || 1} Unit(s)`;
  if (it.rate_type === "Per Event") return "Per Event";
  return "\u2014";
}

function textToArray(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
}

export function renderNavyGold(data) {
  const { workspace, quotation, client, event, items, currency, templateConfig } = data;
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "\u20B9";
  const cfg = templateConfig || {};
  const sections = cfg.sections || {};

  // Company
  const bizName = workspace?.name || "Company Name";
  const nameParts = bizName.trim().split(/\s+/);
  const brandPart1 = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : bizName;
  const brandPart2 = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const companySubtitle = cfg.company?.subtitle || (workspace?.business_type || "").toUpperCase();
  const companyTagline = cfg.company?.tagline || "Quality service you can trust.";
  const companyAddress = [workspace?.address, workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", ");
  const companyPhone = workspace?.phone || "";
  const companyEmail = workspace?.email || "";
  const companyWebsite = cfg.company?.website || "";
  const logoUrl = workspace?.logo || "";
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bizName)}">`
    : `<div style="width:62px;height:62px;display:grid;place-items:center;color:var(--gold);font-size:11px;font-weight:700;border:1px solid var(--gold);border-radius:6px;">LOGO</div>`;

  // Quotation meta
  const quotationTitle = cfg.company?.quotationTitle || "QUOTATION";
  const quoteNumber = quotation?.quotation_number || "";
  const quoteDate = fmtDate(quotation?.quotation_date);
  const validUntil = fmtDate(quotation?.valid_until);
  const preparedBy = workspace?.name || "";

  // Client
  const clientName = client?.name || "Client Name";
  const clientCompany = cfg.client?.company || "";
  const clientAddressLine1 = client?.address || "";
  const clientAddressLine2 = cfg.client?.addressLine2 || "";
  const clientCityStateCountry = [client?.city, client?.state, client?.country].filter(Boolean).join(", ");
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";

  // Project
  const projectTitle = cfg.project?.title || quotation?.project_title || event?.title || "";
  const projectSummary = cfg.project?.summary || quotation?.project_summary || event?.description || "";
  const showProjectSummary = sections.projectSummary !== false;

  // Items
  const itemRows = (items || []).map((it, i) => {
    const deliverables = textToArray(it.description);
    const deliverablesHtml = deliverables.length > 0
      ? `<ul>${deliverables.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "\u2014";
    return `
                <tr>
                    <td>${String(i + 1).padStart(2, "0")}</td>
                    <td class="item-name">${escapeHtml(it.name || "")}</td>
                    <td class="item-deliverables">${deliverablesHtml}</td>
                    <td class="item-duration">${durationText(it)}</td>
                    <td class="item-amount">${symbol} ${formatMoney(it.line_total)}</td>
                </tr>`;
  }).join("") || `
                <tr>
                    <td>01</td>
                    <td class="item-name">No items</td>
                    <td class="item-deliverables">\u2014</td>
                    <td class="item-duration">\u2014</td>
                    <td class="item-amount">${symbol} 0</td>
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

  const discountRow = discountAmount > 0 ? `
                <div class="total-row">
                    <strong>DISCOUNT</strong>
                    <span class="discount">- ${symbol} ${formatMoney(discountAmount)}</span>
                </div>` : "";

  // Notes & Terms
  const notesArray = textToArray(quotation?.notes);
  const termsArray = textToArray(quotation?.terms_and_conditions);
  const showNotes = sections.notes !== false && notesArray.length > 0;
  const showTerms = sections.terms !== false && termsArray.length > 0;

  // Payment
  const payment = cfg.payment || {};
  const showPayment = sections.payment !== false;

  // Bank
  const bank = cfg.bank || {};
  const showBank = sections.bank !== false && bank.enabled !== false;

  // Social
  const socialLinks = (cfg.socialLinks || []).filter((s) => s.enabled && s.shortName);
  const showSocial = sections.social !== false && socialLinks.length > 0;
  const socialHtml = socialLinks.map((s) => `<div class="social-circle">${escapeHtml(s.shortName)}</div>`).join("");

  // Footer
  const footer = cfg.footer || {};
  const showFooter = sections.footer !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quotation ${escapeHtml(quoteNumber)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{
    --primary:#081829;
    --secondary:#101f30;
    --gold:#d89a18;
    --gold-light:#f1b638;
    --text:#111827;
    --muted:#666;
    --border:#d9dde2;
    --soft:#f8f9fa;
}
body{margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:var(--text);}
.quotation-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;position:relative;overflow:hidden;}
.header{min-height:185px;position:relative;border-bottom:2px solid var(--gold);display:grid;grid-template-columns:330px 1fr 380px;}
.header-brand{background:linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%);color:#fff;padding:38px 35px 35px;position:relative;clip-path:polygon(0 0,100% 0,80% 100%,0 100%);}
.header-brand::after{content:"";position:absolute;right:54px;top:0;height:100%;width:2px;background:var(--gold);transform:skewX(-29deg);}
.logo-area{display:flex;align-items:center;gap:15px;}
.logo-area img{width:62px;height:62px;object-fit:contain;}
.company-name{font-size:27px;font-weight:800;}
.company-name span{color:var(--gold);}
.company-type{margin-top:3px;letter-spacing:5px;font-size:13px;}
.company-tagline{margin-top:27px;font-size:14px;line-height:1.55;}
.gold-line{width:60px;height:2px;background:var(--gold);margin-top:15px;}
.company-contact{padding:40px 15px 20px 25px;}
.contact-row{display:flex;gap:13px;margin-bottom:17px;align-items:flex-start;font-size:13px;}
.contact-icon{color:var(--gold);font-size:17px;width:20px;}
.quote-head{padding:30px 32px 15px 10px;text-align:right;}
.quote-title{font-size:47px;line-height:1;font-weight:900;color:var(--primary);}
.quote-number{display:inline-block;margin-top:14px;padding:7px 15px;background:var(--gold);color:#fff;font-size:17px;font-weight:700;}
.quote-meta{margin-top:19px;display:grid;grid-template-columns:auto 10px 1fr;text-align:left;justify-content:end;gap:11px 12px;font-size:12.5px;}
.quote-meta strong{font-weight:700;}
.top-info{display:grid;grid-template-columns:38% 62%;gap:28px;padding:35px 42px 24px;}
.section-label{color:var(--gold);font-weight:800;font-size:14px;margin-bottom:8px;}
.client-name{font-size:22px;font-weight:800;color:var(--primary);margin-bottom:5px;}
.client-details{font-size:13.5px;line-height:1.7;}
.client-contact{margin-top:13px;}
.client-contact div{margin:7px 0;}
.project-summary{border:1px solid #bfc5cb;border-radius:11px;min-height:130px;padding:26px 25px;display:grid;grid-template-columns:66px 1fr;gap:20px;align-items:start;}
.summary-icon{width:66px;height:66px;background:var(--primary);color:var(--gold);border-radius:12px;display:flex;justify-content:center;align-items:center;font-size:29px;}
.summary-title{color:var(--gold);font-size:16px;font-weight:800;margin-bottom:10px;}
.summary-content{font-size:13.5px;line-height:1.65;}
.items-section{padding:0 42px;}
.quotation-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:12.5px;}
.quotation-table th{background:linear-gradient(90deg,var(--secondary),var(--primary));color:var(--gold-light);padding:14px 10px;border-right:1px solid #5a6570;}
.quotation-table th:first-child{width:6%;border-radius:7px 0 0 0;}
.quotation-table th:nth-child(2){width:22%;}
.quotation-table th:nth-child(3){width:38%;}
.quotation-table th:nth-child(4){width:17%;}
.quotation-table th:nth-child(5){width:17%;border-radius:0 7px 0 0;}
.quotation-table td{border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:15px 13px;vertical-align:middle;line-height:1.5;}
.quotation-table td:first-child{border-left:1px solid var(--border);color:var(--gold);font-weight:800;font-size:15px;text-align:center;}
.item-name{font-weight:700;color:var(--primary);}
.item-deliverables ul{padding-left:18px;}
.item-duration,.item-amount{text-align:center;}
.item-amount{white-space:nowrap;font-weight:600;}
.bottom-area{display:grid;grid-template-columns:55% 45%;gap:26px;padding:21px 42px 28px;}
.bottom-card{border-bottom:1px solid var(--border);padding:0 0 14px;margin-bottom:14px;}
.bottom-heading{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.bottom-icon{width:38px;height:38px;background:var(--primary);color:var(--gold);border-radius:8px;display:flex;justify-content:center;align-items:center;}
.bottom-title{color:var(--gold);font-weight:800;font-size:14px;}
.bottom-content{padding-left:50px;font-size:11.5px;line-height:1.55;}
.bottom-content ul{padding-left:15px;}
.total-box{border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.total-row{display:flex;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--border);font-size:13px;}
.total-row strong{font-weight:700;}
.discount{color:#d82323;}
.total-final{background:var(--primary);color:var(--gold-light);font-size:16px;font-weight:800;border-bottom:0;}
.bank-box{margin-top:15px;border:1px solid var(--border);border-radius:8px;padding:15px;}
.bank-heading{color:var(--gold);font-size:13px;font-weight:800;margin-bottom:9px;}
.bank-grid{display:grid;grid-template-columns:105px 8px 1fr;gap:4px;font-size:11.5px;line-height:1.45;}
.footer{margin-top:2px;}
.footer-main{margin:0 42px;padding:18px 5px;border-top:1px solid var(--border);display:grid;grid-template-columns:50px 1fr 220px;gap:18px;align-items:center;}
.handshake{width:48px;height:48px;border-radius:50%;background:var(--gold);display:flex;justify-content:center;align-items:center;font-size:23px;color:#fff;}
.footer-message{font-size:11.5px;line-height:1.5;padding-left:20px;border-left:1px solid var(--border);}
.social{display:flex;justify-content:flex-end;gap:8px;align-items:center;}
.social-label{font-size:11px;margin-right:6px;}
.social-circle{width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;display:flex;justify-content:center;align-items:center;font-size:9px;font-weight:bold;}
.footer-bottom{background:var(--primary);border-top:2px solid var(--gold);text-align:center;color:#fff;padding:11px;font-size:12px;}
.footer-bottom span{color:var(--gold);}
@page{size:A4;margin:0;}
@media print{body{background:#fff;}.quotation-page{width:210mm;min-height:297mm;margin:0;}}
</style>
</head>
<body>

<div class="quotation-page">

    <header class="header">

        <div class="header-brand">

            <div class="logo-area">

                ${logoHtml}

                <div>

                    <div class="company-name">${escapeHtml(brandPart1)}${brandPart2 ? `<span>${escapeHtml(brandPart2)}</span>` : ""}</div>

                    ${companySubtitle ? `<div class="company-type">${escapeHtml(companySubtitle)}</div>` : ""}

                </div>

            </div>

            <div class="company-tagline">${escapeHtml(companyTagline)}</div>

            <div class="gold-line"></div>

        </div>


        <div class="company-contact">

            ${companyAddress ? `<div class="contact-row"><span class="contact-icon">\u25CF</span><span>${escapeHtml(companyAddress)}</span></div>` : ""}

            ${companyPhone ? `<div class="contact-row"><span class="contact-icon">\u260E</span><span>${escapeHtml(companyPhone)}</span></div>` : ""}

            ${companyEmail ? `<div class="contact-row"><span class="contact-icon">\u2709</span><span>${escapeHtml(companyEmail)}</span></div>` : ""}

            ${companyWebsite ? `<div class="contact-row"><span class="contact-icon">\u25CE</span><span>${escapeHtml(companyWebsite)}</span></div>` : ""}

        </div>


        <div class="quote-head">

            <div class="quote-title">${escapeHtml(quotationTitle)}</div>

            <div class="quote-number">${escapeHtml(quoteNumber) || "#QT-000-0000"}</div>

            <div class="quote-meta">

                <strong>Quotation Date</strong>
                <span>:</span>
                <span>${escapeHtml(quoteDate) || "\u2014"}</span>

                <strong>Valid Until</strong>
                <span>:</span>
                <span>${escapeHtml(validUntil) || "\u2014"}</span>

                <strong>Prepared By</strong>
                <span>:</span>
                <span>${escapeHtml(preparedBy)}</span>

            </div>

        </div>

    </header>


    <section class="top-info">

        <div>

            <div class="section-label">TO,</div>

            <div class="client-name">${escapeHtml(clientName)}</div>

            <div class="client-details">

                ${clientCompany ? `${escapeHtml(clientCompany)}<br>` : ""}

                ${clientAddressLine1 ? `${escapeHtml(clientAddressLine1)}<br>` : ""}

                ${clientAddressLine2 ? `${escapeHtml(clientAddressLine2)}<br>` : ""}

                ${clientCityStateCountry ? escapeHtml(clientCityStateCountry) : ""}

                ${(clientEmail || clientPhone) ? `
                <div class="client-contact">

                    ${clientEmail ? `<div>\u2709 ${escapeHtml(clientEmail)}</div>` : ""}

                    ${clientPhone ? `<div>\u260E ${escapeHtml(clientPhone)}</div>` : ""}

                </div>` : ""}

            </div>

        </div>


        ${showProjectSummary && projectTitle ? `
        <div class="project-summary">

            <div class="summary-icon">\u25A4</div>

            <div>

                <div class="summary-title">${escapeHtml(projectTitle)}</div>

                <div class="summary-content">${escapeHtml(projectSummary)}</div>

            </div>

        </div>` : `<div></div>`}

    </section>


    <section class="items-section">

        <table class="quotation-table">

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


    <section class="bottom-area">

        <div>

            ${showNotes ? `
            <div class="bottom-card">

                <div class="bottom-heading">

                    <div class="bottom-icon">\u25A4</div>

                    <div class="bottom-title">NOTES</div>

                </div>

                <div class="bottom-content">

                    <ul>${notesArray.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>

                </div>

            </div>` : ""}


            ${showTerms ? `
            <div class="bottom-card">

                <div class="bottom-heading">

                    <div class="bottom-icon">\u2713</div>

                    <div class="bottom-title">TERMS &amp; CONDITIONS</div>

                </div>

                <div class="bottom-content">

                    <ul>${termsArray.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>

                </div>

            </div>` : ""}


            ${showPayment ? `
            <div class="bottom-card">

                <div class="bottom-heading">

                    <div class="bottom-icon">${escapeHtml(symbol)}</div>

                    <div class="bottom-title">PAYMENT METHOD</div>

                </div>

                <div class="bottom-content">

                    ${escapeHtml(payment.method || "Bank Transfer / UPI / Cheque")}<br>

                    ${escapeHtml(payment.instructions || "Payment details will be shared upon confirmation.")}

                </div>

            </div>` : ""}

        </div>


        <div>

            <div class="total-box">

                <div class="total-row">

                    <strong>SUBTOTAL</strong>

                    <span>${symbol} ${formatMoney(subtotal)}</span>

                </div>

                ${discountRow}

                <div class="total-row">

                    <strong>TAX (${gstPercentage}% GST)</strong>

                    <span>${symbol} ${formatMoney(gstTotal)}</span>

                </div>

                <div class="total-row total-final">

                    <span>TOTAL AMOUNT</span>

                    <span>${symbol} ${formatMoney(grandTotal)}</span>

                </div>

            </div>

            ${showBank ? `
            <div class="bank-box">

                <div class="bank-heading">BANK DETAILS</div>

                <div class="bank-grid">

                    <span>Bank Name</span><span>:</span><span>${escapeHtml(bank.bankName || "")}</span>

                    <span>Account Name</span><span>:</span><span>${escapeHtml(bank.accountName || "")}</span>

                    <span>Account No.</span><span>:</span><span>${escapeHtml(bank.accountNumber || "")}</span>

                    <span>IFSC Code</span><span>:</span><span>${escapeHtml(bank.ifsc || "")}</span>

                    <span>Branch</span><span>:</span><span>${escapeHtml(bank.branch || "")}</span>

                </div>

            </div>` : ""}

        </div>

    </section>


    ${showFooter ? `
    <footer class="footer">

        <div class="footer-main">

            <div class="handshake">\u2666</div>

            <div class="footer-message">

                ${escapeHtml(footer.messageLine1 || "We appreciate the opportunity to work with you.")}<br>

                ${escapeHtml(footer.messageLine2 || "Looking forward to building something great together.")}

            </div>

            ${showSocial ? `
            <div class="social">

                <span class="social-label">Follow Us</span>

                ${socialHtml}

            </div>` : `<div class="social"></div>`}

        </div>


        ${footer.creditName ? `
        <div class="footer-bottom">

            ${escapeHtml(footer.creditPrefix || "developed by")} <span>${escapeHtml(footer.creditName)}</span>

        </div>` : ""}

    </footer>` : ""}

</div>

</body>
</html>`;
}