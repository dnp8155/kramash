import { includedDates, formatDateFull } from "@/lib/quotationCalc";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtDateLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
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

// Indian numbering system: Crore, Lakh, Thousand, Hundred
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

const CONTEXT_LABELS = {
  bride_side: "Bride Side",
  groom_side: "Groom Side",
  common: "Both (Bride & Groom)",
  both: "Both (Bride & Groom)",
  residential: "Residential",
  commercial: "Commercial"
};

const TEAM_TYPES = new Set(["team", "role"]);

// Group team item names per day, collapsing duplicates into "+N Name".
function teamLinesForDay(dayItems) {
  const counts = new Map();
  const order = [];
  for (const it of dayItems) {
    if (!TEAM_TYPES.has(it.item_type)) continue;
    const label = it.team_member_name_snapshot || it.name || "Team Member";
    const qty = Math.max(1, Number(it.quantity) || 1);
    if (!counts.has(label)) { counts.set(label, 0); order.push(label); }
    counts.set(label, counts.get(label) + qty);
  }
  const lines = [];
  for (const label of order) {
    const total = counts.get(label);
    lines.push(escapeHtml(label));
    for (let i = 1; i < total; i++) lines.push(`+1 ${escapeHtml(label)}`);
  }
  return lines;
}

export function renderClassicMinimal(data) {
  const { workspace, quotation, client, event, items, currency } = data;

  // Header — business contact block
  const bizName = workspace?.name || "Business Name";
  const bizPhone = workspace?.phone || "";
  const bizEmail = workspace?.email || "";
  const bizAddress = [workspace?.address, workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", ");
  const logoUrl = workspace?.logo || "";

  const quoteNumber = quotation?.quotation_number || "";
  const quoteDate = fmtDateLong(quotation?.quotation_date);

  // Client details
  const clientName = client?.name || "Client Name";
  const clientAddress = client?.address || "";
  const eventVenue = event?.venue || "";
  const clientPhone = client?.phone || "";
  const clientEmail = client?.email || "";
  const sideLabel = CONTEXT_LABELS[quotation?.context_type] || (quotation?.context_type ? escapeHtml(quotation.context_type) : "");

  const eventDates = includedDates(quotation?.start_date, quotation?.end_date, quotation?.excluded_dates || []);
  const eventDatesHtml = eventDates.length
    ? eventDates.map((d) => `<div class="date-line">- ${escapeHtml(formatDateFull(d))}</div>`).join("")
    : `<div class="date-line">&mdash;</div>`;

  // Event details — group items by day
  const dayMap = new Map();
  for (const it of items || []) {
    const key = it.day_date || "_no_date";
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(it);
  }
  const dayKeys = Array.from(dayMap.keys()).sort((a, b) => (a === "_no_date" ? 1 : a.localeCompare(b)));

  const dayBlocksHtml = dayKeys.map((key, idx) => {
    const dayItems = dayMap.get(key);
    const phaseTitle = dayItems.find((it) => it.phase_title)?.phase_title || "";
    const nonTeamNames = dayItems.filter((it) => !TEAM_TYPES.has(it.item_type)).map((it) => it.name).filter(Boolean);
    const teamLines = teamLinesForDay(dayItems);
    const dateLabel = key !== "_no_date" ? fmtDateLong(key).replace(/,\s*(\d{4})$/, ", $1") : "";
    const dateShort = key !== "_no_date" ? new Date(key + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

    return `
      <div class="day-block">
        <div class="day-heading">Day ${idx + 1}${dateShort ? ` [${escapeHtml(dateShort)}]` : ""}</div>
        ${phaseTitle ? `<div class="detail-line"><span class="detail-label">Event Name:</span> ${escapeHtml(phaseTitle)}</div>` : ""}
        ${eventVenue ? `<div class="detail-line"><span class="detail-label">Venue/Time:</span> ${escapeHtml(eventVenue)}</div>` : ""}
        <div class="detail-line"><span class="detail-label">Events:</span> ${nonTeamNames.length ? escapeHtml(nonTeamNames.join(", ")) : "Not Specified"}</div>
        <div class="detail-line team-line">
          <span class="detail-label">Team:</span>
          <div class="team-list">${teamLines.length ? teamLines.map((l) => `<div>${l}</div>`).join("") : "<div>&mdash;</div>"}</div>
        </div>
      </div>`;
  }).join("");

  // Includes — from special notes (free text bullet list)
  const includesHtml = textToBullets(quotation?.special_notes);

  // Pricing
  const grandTotal = quotation?.grand_total || 0;
  const currencySymbol = currency === "INR" ? "Rs" : (currency || "");
  const totalWords = `(${currency === "INR" ? "INR " : ""}${amountInWords(grandTotal)}${grandTotal % 1 !== 0 ? "" : ""})`;

  // Notes
  const notesHtml = textToBullets(quotation?.notes);
  const termsText = quotation?.terms_and_conditions
    ? `<div class="bullet-line">${escapeHtml(quotation.terms_and_conditions)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quotation ${escapeHtml(quoteNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
    .quotation-page { width: 1000px; max-width: 100%; margin: auto; background: #fff; padding: 40px 46px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; gap: 20px; }
    .header-logo { width: 60px; height: 60px; flex-shrink: 0; }
    .header-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .header-brand { flex: 1; }
    .header-brand-name { font-size: 18px; font-weight: 800; }
    .header-contact { text-align: right; font-size: 13px; line-height: 1.6; color: #333; }
    .meta-row { display: flex; justify-content: space-between; margin-top: 18px; font-size: 13px; }
    .quote-heading { text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 22px 0 24px; }
    .section-title { font-weight: 800; font-size: 14px; text-decoration: underline; margin-bottom: 10px; margin-top: 26px; }
    .detail-line { margin-bottom: 8px; font-size: 14px; }
    .detail-label { font-weight: 700; }
    .team-line { display: flex; gap: 4px; }
    .team-list { display: flex; flex-direction: column; }
    .day-block { margin-bottom: 22px; padding-bottom: 4px; }
    .day-heading { font-weight: 800; font-size: 15px; margin-bottom: 8px; }
    .bullet-line { margin-bottom: 4px; font-size: 14px; }
    .date-line { margin-left: 12px; font-size: 14px; }
    .pricing-box { margin-top: 8px; }
    .total-amount { font-size: 16px; font-weight: 800; margin: 6px 0 4px; }
    .amount-words { font-style: italic; font-size: 13px; color: #444; }
    .signed-block { margin-top: 30px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 12px; text-align: center; font-size: 12px; color: #666; }
    @media print {
      @page { size: A4; margin: 12mm; }
      .quotation-page { width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="quotation-page">

    <div class="header">
      ${logoUrl ? `<div class="header-logo"><img src="${escapeHtml(logoUrl)}" alt="Logo" /></div>` : ""}
      <div class="header-brand">
        <div class="header-brand-name">${escapeHtml(bizName)}</div>
      </div>
      <div class="header-contact">
        ${bizPhone ? `<div>Phone: ${escapeHtml(bizPhone)}</div>` : ""}
        ${bizEmail ? `<div>Email: ${escapeHtml(bizEmail)}</div>` : ""}
        ${bizAddress ? `<div>Address: ${escapeHtml(bizAddress)}</div>` : ""}
      </div>
    </div>

    <div class="meta-row">
      <div><strong>Quotation No:</strong> ${escapeHtml(quoteNumber)}</div>
      <div><strong>Date:</strong> ${escapeHtml(quoteDate)}</div>
    </div>

    <div class="quote-heading">QUOTATION</div>

    <div class="section-title">CLIENT DETAILS</div>
    <div class="detail-line"><span class="detail-label">Name:</span> ${escapeHtml(clientName)}</div>
    ${clientAddress ? `<div class="detail-line"><span class="detail-label">Residence Address:</span> ${escapeHtml(clientAddress)}</div>` : ""}
    ${eventVenue ? `<div class="detail-line"><span class="detail-label">Event Venue:</span> ${escapeHtml(eventVenue)}</div>` : ""}
    ${clientPhone ? `<div class="detail-line"><span class="detail-label">Contact Number:</span> ${escapeHtml(clientPhone)}</div>` : ""}
    ${clientEmail ? `<div class="detail-line"><span class="detail-label">Email:</span> ${escapeHtml(clientEmail)}</div>` : ""}
    ${sideLabel ? `<div class="detail-line"><span class="detail-label">Side(s):</span> ${sideLabel}</div>` : ""}
    <div class="detail-line"><span class="detail-label">Event Date(s):</span> (${eventDates.length} Day${eventDates.length === 1 ? "" : "s"})</div>
    ${eventDatesHtml}

    <div class="section-title">EVENT DETAILS</div>
    ${dayBlocksHtml || `<div class="detail-line">&mdash;</div>`}

    ${includesHtml ? `<div class="section-title">INCLUDES</div>${includesHtml}` : ""}

    <div class="section-title">PRICING</div>
    <div class="pricing-box">
      <div class="total-amount">Total Amount: ${escapeHtml(currencySymbol)} ${Number(grandTotal).toLocaleString("en-IN")}</div>
      <div class="amount-words">${totalWords}</div>
    </div>

    ${(notesHtml || termsText) ? `
    <div class="section-title">NOTES</div>
    ${notesHtml}
    ${termsText}` : ""}

    <div class="signed-block">
      <div class="section-title">ELECTRONICALLY SIGNED &amp; AUTHORIZED BY:</div>
      <div class="detail-line">${escapeHtml(bizName)} on ${escapeHtml(quoteDate)}</div>
    </div>

    <div class="footer">${escapeHtml(bizName)}</div>
  </div>
</body>
</html>`;
}